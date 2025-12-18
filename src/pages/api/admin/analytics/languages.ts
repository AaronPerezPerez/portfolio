import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../../lib/admin-auth';
import { createDb, sql } from '../../../../db';

export const prerender = false;

// GET /api/admin/analytics/languages
// Returns language distribution based on message content analysis
export async function GET(context: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  const authenticated = await isAuthenticated(context);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers }
    );
  }

  const d1 = context.locals.runtime?.env?.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ error: 'Database not available' }),
      { status: 500, headers }
    );
  }

  try {
    const db = createDb(d1);

    // Get all user messages (only analyze user messages, not AI responses)
    const messages = await db.all(sql`
      SELECT content
      FROM messages
      WHERE role = 'user' AND deleted_at IS NULL
    `) as { content: string }[];

    // Analyze language distribution
    const langCounts = { es: 0, en: 0, other: 0 };
    for (const msg of messages) {
      const lang = detectLanguage(msg.content);
      langCounts[lang]++;
    }

    const total = messages.length || 1;
    const languages = [
      { code: 'es', name: 'Spanish', count: langCounts.es, percentage: Math.round((langCounts.es / total) * 100) },
      { code: 'en', name: 'English', count: langCounts.en, percentage: Math.round((langCounts.en / total) * 100) },
      { code: 'other', name: 'Other', count: langCounts.other, percentage: Math.round((langCounts.other / total) * 100) },
    ].filter(l => l.count > 0);

    return new Response(
      JSON.stringify({ languages, total: messages.length }),
      { headers }
    );
  } catch (error) {
    console.error('[Analytics Languages Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch language data' }),
      { status: 500, headers }
    );
  }
}

// Simple language detection using word patterns
function detectLanguage(text: string): 'es' | 'en' | 'other' {
  const lowerText = text.toLowerCase();

  // Spanish indicators
  const spanishPatterns = [
    /\b(hola|qué|cómo|cuál|está|están|para|por|con|una|uno|que|eres|puedes|cuéntame|buenas|dónde|cuánto|cuántos|tengo|tienes)\b/gi,
    /[áéíóúñ¿¡]/g
  ];

  // English indicators
  const englishPatterns = [
    /\b(the|what|how|your|with|for|you|are|this|have|can|do|does|tell|about|hello|hi|hey|nice|great|cool|where|when|why)\b/gi
  ];

  let esScore = 0;
  let enScore = 0;

  for (const pattern of spanishPatterns) {
    const matches = lowerText.match(pattern);
    esScore += matches ? matches.length : 0;
  }

  for (const pattern of englishPatterns) {
    const matches = lowerText.match(pattern);
    enScore += matches ? matches.length : 0;
  }

  if (esScore > enScore) return 'es';
  if (enScore > esScore) return 'en';
  if (esScore === 0 && enScore === 0) return 'other';
  return 'en'; // Default to English on tie
}
