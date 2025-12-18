import type { APIContext } from 'astro';
import { loadMessages, createDb } from '../../lib/db';

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

  const d1 = locals.runtime?.env?.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ messages: [] }),
      { headers }
    );
  }

  try {
    const db = createDb(d1);
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
