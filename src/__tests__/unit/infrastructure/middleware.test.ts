/**
 * Infrastructure Layer - Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withAdminAuth,
  withDatabase,
  withAdminAuthAndDatabase,
  createErrorResponse,
  createSuccessResponse,
  parseIdParam,
  getDatabase,
} from '../../../infrastructure/http';
import type { APIContext } from 'astro';

// Mock the admin-auth module
vi.mock('../../../lib/admin-auth', () => ({
  isAuthenticated: vi.fn(),
}));

import { isAuthenticated } from '../../../lib/admin-auth';

describe('AdminAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withAdminAuth', () => {
    it('should call handler when authenticated', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(true);

      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withAdminAuth(handler);
      const mockContext = {} as APIContext;

      const response = await wrappedHandler(mockContext);

      expect(handler).toHaveBeenCalledWith(mockContext);
      expect(response.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false);

      const handler = vi.fn();
      const wrappedHandler = withAdminAuth(handler);
      const mockContext = {} as APIContext;

      const response = await wrappedHandler(mockContext);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const body = await response.json() as { error: string };
      expect(body.error).toBe('Unauthorized');
    });

    it('should use custom headers', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false);

      const handler = vi.fn();
      const wrappedHandler = withAdminAuth(handler, {
        headers: { 'X-Custom': 'value' },
      });

      const response = await wrappedHandler({} as APIContext);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('withDatabase', () => {
    it('should pass database to handler when available', async () => {
      const mockDb = {} as D1Database;
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withDatabase(handler);
      const mockContext = {
        locals: {
          runtime: {
            env: { DB: mockDb },
          },
        },
      } as unknown as APIContext;

      const response = await wrappedHandler(mockContext);

      expect(handler).toHaveBeenCalledWith(mockContext, mockDb);
      expect(response.status).toBe(200);
    });

    it('should return 500 when database not available', async () => {
      const handler = vi.fn();
      const wrappedHandler = withDatabase(handler);
      const mockContext = {
        locals: {
          runtime: {
            env: {},
          },
        },
      } as unknown as APIContext;

      const response = await wrappedHandler(mockContext);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(500);

      const body = await response.json() as { error: string };
      expect(body.error).toBe('Database not available');
    });
  });

  describe('withAdminAuthAndDatabase', () => {
    it('should combine auth and database checks', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(true);

      const mockDb = {} as D1Database;
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withAdminAuthAndDatabase(handler);
      const mockContext = {
        locals: {
          runtime: {
            env: { DB: mockDb },
          },
        },
      } as unknown as APIContext;

      const response = await wrappedHandler(mockContext);

      expect(handler).toHaveBeenCalledWith(mockContext, mockDb);
      expect(response.status).toBe(200);
    });

    it('should fail fast on auth failure', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false);

      const handler = vi.fn();
      const wrappedHandler = withAdminAuthAndDatabase(handler);

      const response = await wrappedHandler({} as APIContext);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message and status', async () => {
      const response = createErrorResponse('Not found', 404);

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json() as { error: string };
      expect(body.error).toBe('Not found');
    });

    it('should use custom headers', async () => {
      const response = createErrorResponse('Error', 500, {
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      });

      expect(response.headers.get('X-Custom')).toBe('value');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);

      const body = await response.json() as typeof data;
      expect(body).toEqual(data);
    });

    it('should use custom status code', async () => {
      const response = createSuccessResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('getDatabase', () => {
    it('should return database from context', () => {
      const mockDb = {} as D1Database;
      const context = {
        locals: {
          runtime: {
            env: { DB: mockDb },
          },
        },
      } as unknown as APIContext;

      expect(getDatabase(context)).toBe(mockDb);
    });

    it('should return null when database not available', () => {
      const context = {
        locals: {
          runtime: {
            env: {},
          },
        },
      } as unknown as APIContext;

      expect(getDatabase(context)).toBeNull();
    });

    it('should handle missing runtime', () => {
      const context = {
        locals: {},
      } as unknown as APIContext;

      expect(getDatabase(context)).toBeNull();
    });
  });

  describe('parseIdParam', () => {
    it('should parse valid numeric ID', () => {
      const context = {
        params: { id: '123' },
      } as unknown as APIContext;

      const result = parseIdParam(context);

      expect('id' in result).toBe(true);
      if ('id' in result) {
        expect(result.id).toBe(123);
      }
    });

    it('should return error for missing param', () => {
      const context = {
        params: {},
      } as unknown as APIContext;

      const result = parseIdParam(context);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('id parameter required');
      }
    });

    it('should return error for invalid param', () => {
      const context = {
        params: { id: 'abc' },
      } as unknown as APIContext;

      const result = parseIdParam(context);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Invalid id parameter');
      }
    });

    it('should return error for negative ID', () => {
      const context = {
        params: { id: '-5' },
      } as unknown as APIContext;

      const result = parseIdParam(context);

      expect('error' in result).toBe(true);
    });

    it('should support custom param name', () => {
      const context = {
        params: { conversationId: '456' },
      } as unknown as APIContext;

      const result = parseIdParam(context, 'conversationId');

      expect('id' in result).toBe(true);
      if ('id' in result) {
        expect(result.id).toBe(456);
      }
    });
  });
});
