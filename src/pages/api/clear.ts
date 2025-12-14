import type { APIContext } from 'astro';
import { clearConversation } from '../../lib/db';

export const prerender = false;

export async function POST({ request, locals }: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { userId } = await request.json() as { userId?: string };

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { status: 400, headers }
      );
    }

    // @ts-expect-error - Cloudflare runtime types
    const db = locals.runtime?.env?.DB;

    if (db) {
      await clearConversation(db, userId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers }
    );
  } catch (error) {
    console.error('[Clear API Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}
