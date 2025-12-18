import type { APIContext } from 'astro';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionData {
  exp: number; // expiration timestamp
}

// Create HMAC signature for session data
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Verify HMAC signature
async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(data, secret);
  return signature === expected;
}

// Create a signed session cookie
export async function createSessionCookie(secret: string): Promise<string> {
  const session: SessionData = {
    exp: Date.now() + SESSION_DURATION
  };
  const data = JSON.stringify(session);
  const signature = await sign(data, secret);
  const value = btoa(data) + '.' + signature;

  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`;
}

// Clear session cookie
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Verify session from request cookies
export async function verifySession(request: Request, secret: string): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return false;

  try {
    const [dataB64, signature] = sessionCookie.split('.');
    if (!dataB64 || !signature) return false;

    const data = atob(dataB64);
    const isValid = await verify(data, signature, secret);
    if (!isValid) return false;

    const session: SessionData = JSON.parse(data);
    if (Date.now() > session.exp) return false;

    return true;
  } catch {
    return false;
  }
}

// Get admin secret from environment
export function getAdminSecret(locals: APIContext['locals']): string | null {
  return locals.runtime?.env?.ADMIN_SECRET || null;
}

// Check if request is authenticated
export async function isAuthenticated(context: APIContext): Promise<boolean> {
  const secret = getAdminSecret(context.locals);
  if (!secret) return false;
  return verifySession(context.request, secret);
}
