import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../../lib/admin-auth';

export const prerender = false;

interface MessageRow {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ConversationInfo {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
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

  const conversationId = context.params.id;
  if (!conversationId) {
    return new Response(
      JSON.stringify({ error: 'Conversation ID required' }),
      { status: 400, headers }
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
    // Get conversation info
    const conversation = await db.prepare(`
      SELECT id, user_id, created_at, updated_at
      FROM conversations
      WHERE id = ?
    `).bind(conversationId).first<ConversationInfo>();

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers }
      );
    }

    // Get messages
    const messagesResult = await db.prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC
    `).bind(conversationId).all<MessageRow>();

    return new Response(
      JSON.stringify({
        conversation,
        messages: messagesResult.results
      }),
      { headers }
    );
  } catch (error) {
    console.error('[Admin Conversation Detail Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch conversation' }),
      { status: 500, headers }
    );
  }
}
