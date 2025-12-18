/**
 * Leads Analytics API
 * Detect potential leads based on message content
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

// Keywords that indicate lead intent (grouped by category)
const LEAD_KEYWORDS = {
  hiring: {
    en: ['hire', 'hiring', 'contract', 'contractor', 'freelance', 'freelancer', 'developer', 'engineer', 'looking for', 'need a', 'need someone'],
    es: ['contratar', 'contrato', 'freelance', 'desarrollador', 'programador', 'busco', 'necesito', 'buscando'],
    weight: 3,
  },
  pricing: {
    en: ['price', 'pricing', 'cost', 'rate', 'rates', 'budget', 'quote', 'hourly', 'fee', 'fees', 'charge'],
    es: ['precio', 'precios', 'costo', 'costos', 'tarifa', 'tarifas', 'presupuesto', 'cotización', 'cobras', 'cobra'],
    weight: 3,
  },
  availability: {
    en: ['available', 'availability', 'when can', 'free', 'schedule', 'start', 'timeline', 'deadline'],
    es: ['disponible', 'disponibilidad', 'cuando puedes', 'libre', 'horario', 'empezar', 'comenzar', 'plazo'],
    weight: 2,
  },
  contact: {
    en: ['contact', 'email', 'call', 'meet', 'meeting', 'discuss', 'talk', 'chat', 'reach', 'phone', 'linkedin', 'portfolio'],
    es: ['contacto', 'correo', 'llamar', 'reunión', 'hablar', 'charlar', 'teléfono'],
    weight: 2,
  },
  project: {
    en: ['project', 'projects', 'app', 'application', 'website', 'web', 'build', 'develop', 'create', 'make'],
    es: ['proyecto', 'proyectos', 'aplicación', 'página', 'sitio', 'construir', 'desarrollar', 'crear', 'hacer'],
    weight: 1,
  },
  tech: {
    en: ['react', 'typescript', 'javascript', 'node', 'frontend', 'backend', 'fullstack', 'api', 'database'],
    es: ['react', 'typescript', 'javascript', 'node', 'frontend', 'backend', 'fullstack', 'api', 'base de datos'],
    weight: 1,
  },
};

interface Lead {
  conversationId: number;
  userId: string;
  score: number;
  matchedKeywords: string[];
  lastMessage: string | null;
  messageCount: number;
  createdAt: string | null;
}

/**
 * GET /api/admin/analytics/leads
 * Get potential leads with scoring
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const minScore = parseInt(url.searchParams.get('minScore') || '2', 10);

      // Get all user messages with conversation info
      const result = await d1
        .prepare(`
          SELECT
            c.id as conversation_id,
            c.user_id,
            c.created_at,
            m.content,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) as message_count,
            (SELECT content FROM messages
             WHERE conversation_id = c.id AND deleted_at IS NULL
             ORDER BY created_at DESC LIMIT 1) as last_message
          FROM conversations c
          INNER JOIN messages m ON m.conversation_id = c.id
          WHERE m.role = 'user'
            AND m.deleted_at IS NULL
            AND c.deleted_at IS NULL
          ORDER BY c.id
        `)
        .all<{
          conversation_id: number;
          user_id: string;
          created_at: string | null;
          content: string;
          message_count: number;
          last_message: string | null;
        }>();

      // Group messages by conversation and calculate lead scores
      const conversationScores = new Map<number, {
        userId: string;
        score: number;
        keywords: Set<string>;
        lastMessage: string | null;
        messageCount: number;
        createdAt: string | null;
      }>();

      for (const row of result.results) {
        const existing = conversationScores.get(row.conversation_id) || {
          userId: row.user_id,
          score: 0,
          keywords: new Set<string>(),
          lastMessage: row.last_message,
          messageCount: row.message_count,
          createdAt: row.created_at,
        };

        // Analyze content for lead keywords
        const { score, keywords } = analyzeContent(row.content);
        existing.score += score;
        keywords.forEach((k) => existing.keywords.add(k));

        conversationScores.set(row.conversation_id, existing);
      }

      // Convert to array, filter by min score, and sort
      const leads: Lead[] = Array.from(conversationScores.entries())
        .filter(([, data]) => data.score >= minScore)
        .map(([conversationId, data]) => ({
          conversationId,
          userId: data.userId,
          score: data.score,
          matchedKeywords: Array.from(data.keywords),
          lastMessage: data.lastMessage,
          messageCount: data.messageCount,
          createdAt: data.createdAt,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Calculate summary stats
      const totalLeads = leads.length;
      const highQualityLeads = leads.filter((l) => l.score >= 5).length;
      const avgScore = leads.length > 0
        ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length * 10) / 10
        : 0;

      return createSuccessResponse({
        leads,
        stats: {
          total: totalLeads,
          highQuality: highQualityLeads,
          averageScore: avgScore,
        },
      });
    } catch (error) {
      console.error('[Leads Analytics Error]:', error);
      return createErrorResponse('Failed to analyze leads', 500);
    }
  }
);

/**
 * Analyze content for lead indicators
 */
function analyzeContent(content: string): { score: number; keywords: string[] } {
  const lowerContent = content.toLowerCase();
  let score = 0;
  const keywords: string[] = [];

  for (const [category, config] of Object.entries(LEAD_KEYWORDS)) {
    const allKeywords = [...config.en, ...config.es];

    for (const keyword of allKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        score += config.weight;
        if (!keywords.includes(category)) {
          keywords.push(category);
        }
        break; // Only count each category once per message
      }
    }
  }

  return { score, keywords };
}
