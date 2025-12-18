/**
 * AdminAuthMiddleware
 * Centralizes authentication checks for admin endpoints
 */

import type { APIContext } from 'astro';
import { isAuthenticated } from '../../lib/admin-auth';

export interface AuthenticatedHandler {
  (context: APIContext): Promise<Response>;
}

export interface AdminMiddlewareOptions {
  headers?: Record<string, string>;
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * Higher-order function that wraps an API handler with authentication
 */
export function withAdminAuth(
  handler: AuthenticatedHandler,
  options: AdminMiddlewareOptions = {}
): AuthenticatedHandler {
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

  return async (context: APIContext): Promise<Response> => {
    // Check authentication
    const authenticated = await isAuthenticated(context);

    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      });
    }

    // Call the original handler
    return handler(context);
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  headers: Record<string, string> = DEFAULT_HEADERS
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers,
  });
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = DEFAULT_HEADERS
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Extracts and validates the D1 database from context
 */
export function getDatabase(context: APIContext): D1Database | null {
  return context.locals.runtime?.env?.DB ?? null;
}

/**
 * Middleware that requires database availability
 */
export function withDatabase(
  handler: (context: APIContext, db: D1Database) => Promise<Response>,
  options: AdminMiddlewareOptions = {}
): AuthenticatedHandler {
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

  return async (context: APIContext): Promise<Response> => {
    const db = getDatabase(context);

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers,
      });
    }

    return handler(context, db);
  };
}

/**
 * Combines auth and database middleware
 */
export function withAdminAuthAndDatabase(
  handler: (context: APIContext, db: D1Database) => Promise<Response>,
  options: AdminMiddlewareOptions = {}
): AuthenticatedHandler {
  return withAdminAuth(withDatabase(handler, options), options);
}

/**
 * Parses and validates a numeric ID from route params
 */
export function parseIdParam(
  context: APIContext,
  paramName = 'id'
): { id: number } | { error: string } {
  const param = context.params[paramName];

  if (!param) {
    return { error: `${paramName} parameter required` };
  }

  const id = parseInt(param, 10);

  if (isNaN(id) || id <= 0) {
    return { error: `Invalid ${paramName} parameter` };
  }

  return { id };
}
