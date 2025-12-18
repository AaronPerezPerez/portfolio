import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../../lib/admin-auth';
import { createDb, sql } from '../../../../db';

export const prerender = false;

// Topic patterns to categorize messages
const TOPIC_PATTERNS: Record<string, RegExp> = {
  'Tech Stack': /stack|tecnolog|typescript|react|node|frontend|backend|framework|lenguaje|language|programming/i,
  'Experience': /experiencia|experience|años|years|worked|trabajado|proyecto|project|portfolio/i,
  'Availability': /disponible|available|hire|contratar|freelance|trabajo|work|remote|remoto|time/i,
  'Pricing': /precio|price|rate|cobr|hora|hour|cost|presupuesto|budget|cuánto/i,
  'Contact': /contact|email|hablar|llamar|meet|reunion|meeting|correo|linkedin|whatsapp/i,
  'Skills': /skill|habilidad|conocimiento|saber|sabes|conoces|dominas|learning|aprender/i,
  'About': /quién|who|about|sobre|cuéntame|tell|yourself|ti|presentar|introduce/i,
};

// GET /api/admin/analytics/topics
// Returns topic distribution based on message content analysis
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

    // Get all user messages
    const messages = await db.all(sql`
      SELECT content
      FROM messages
      WHERE role = 'user' AND deleted_at IS NULL
    `) as { content: string }[];

    // Count topics
    const topicCounts: Record<string, number> = {};
    for (const topic of Object.keys(TOPIC_PATTERNS)) {
      topicCounts[topic] = 0;
    }
    topicCounts['Other'] = 0;

    for (const msg of messages) {
      let matched = false;
      for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
        if (pattern.test(msg.content)) {
          topicCounts[topic]++;
          matched = true;
          break; // Only count first match per message
        }
      }
      if (!matched) {
        topicCounts['Other']++;
      }
    }

    // Sort by count descending and format
    const topics = Object.entries(topicCounts)
      .map(([name, count]) => ({ name, count }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const maxCount = topics[0]?.count || 1;

    return new Response(
      JSON.stringify({
        topics: topics.map(t => ({
          ...t,
          percentage: Math.round((t.count / maxCount) * 100)
        })),
        total: messages.length
      }),
      { headers }
    );
  } catch (error) {
    console.error('[Analytics Topics Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch topics data' }),
      { status: 500, headers }
    );
  }
}
