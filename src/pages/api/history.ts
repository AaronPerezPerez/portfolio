import type { APIContext } from 'astro';
import { loadMessages } from '../../lib/db';

export const prerender = false;

export async function GET({ request, locals }: APIContext) {
  const headers = { 'Content-Type': 'application/json' };
  const userId = new URL(request.url).searchParams.get('userId');

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'userId required' }),
      { status: 400, headers }
    );
  }

  // @ts-expect-error - Cloudflare runtime types
  const db = locals.runtime?.env?.DB;

  if (!db) {
    return new Response(
      JSON.stringify({ messages: [] }),
      { headers }
    );
  }

  try {
    const messages = await loadMessages(db, userId);
    return new Response(
      JSON.stringify({ messages }),
      { headers }
    );
  } catch (error) {
    console.error('[History API Error]:', error);
    return new Response(
      JSON.stringify({ messages: [] }),
      { headers }
    );
  }
}
