/**
 * Admin Trash API
 * List soft-deleted conversations
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../infrastructure/http';
import { D1ConversationRepository } from '../../../infrastructure/persistence';

export const prerender = false;

/**
 * GET /api/admin/trash
 * List all soft-deleted conversations
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);

      const repository = new D1ConversationRepository(d1);
      const conversations = await repository.listDeleted(limit);

      return createSuccessResponse({
        conversations,
        count: conversations.length,
      });
    } catch (error) {
      console.error('[Admin Trash Error]:', error);
      return createErrorResponse('Failed to fetch trash', 500);
    }
  }
);
