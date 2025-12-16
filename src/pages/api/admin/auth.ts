import type { APIContext } from 'astro';
import { createSessionCookie, clearSessionCookie, getAdminSecret, isAuthenticated } from '../../../lib/admin-auth';

export const prerender = false;

// POST: Login
export async function POST({ request, locals }: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { password } = await request.json();
    const secret = getAdminSecret(locals);

    if (!secret) {
      return new Response(
        JSON.stringify({ error: 'Admin not configured' }),
        { status: 500, headers }
      );
    }

    if (password !== secret) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers }
      );
    }

    const cookie = await createSessionCookie(secret);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie
        }
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers }
    );
  }
}

// DELETE: Logout
export async function DELETE() {
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie()
      }
    }
  );
}

// GET: Check auth status
export async function GET(context: APIContext) {
  const authenticated = await isAuthenticated(context);

  return new Response(
    JSON.stringify({ authenticated }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
