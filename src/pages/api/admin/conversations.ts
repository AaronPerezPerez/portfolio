import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../lib/admin-auth';

export const prerender = false;

interface ConversationRow {
  id: number;
  user_id: string;
  created_at: string;
  message_count: number;
  last_message_at: string | null;
  last_message: string | null;
}

interface StatsRow {
  total_conversations: number;
  total_messages: number;
  messages_today: number;
}

export async function GET(context: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  // Check authentication
  const authenticated = await isAuthenticated(context);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers }
    );
  }

  // @ts-expect-error - Cloudflare runtime types
  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database not available' }),
      { status: 500, headers }
    );
  }

  try {
    // Get conversations with stats
    const conversationsResult = await db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.created_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at,
        (SELECT content FROM messages
         WHERE conversation_id = c.id AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY last_message_at DESC
      LIMIT 100
    `).all<ConversationRow>();

    // Get global stats
    const statsResult = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM conversations) as total_conversations,
        (SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL
         AND created_at > datetime('now', '-1 day')) as messages_today
    `).first<StatsRow>();

    return new Response(
      JSON.stringify({
        conversations: conversationsResult.results,
        stats: statsResult || { total_conversations: 0, total_messages: 0, messages_today: 0 }
      }),
      { headers }
    );
  } catch (error) {
    console.error('[Admin Conversations Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch conversations' }),
      { status: 500, headers }
    );
  }
}
