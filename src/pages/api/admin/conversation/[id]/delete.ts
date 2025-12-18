/**
 * Conversation Delete API
 * Soft delete and permanent delete operations
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../../infrastructure/http';
import { D1ConversationRepository } from '../../../../../infrastructure/persistence';

export const prerender = false;

/**
 * DELETE /api/admin/conversation/[id]/delete
 * Soft delete a conversation
 */
export const DELETE = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const conversationId = parseInt(context.params.id || '0', 10);

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      const repository = new D1ConversationRepository(d1);

      // Verify conversation exists
      const conversation = await repository.findById(conversationId);
      if (!conversation) {
        return createErrorResponse('Conversation not found', 404);
      }

      await repository.softDelete(conversationId);

      return createSuccessResponse({ deleted: true, conversationId });
    } catch (error) {
      console.error('[Conversation Delete Error]:', error);
      return createErrorResponse('Failed to delete conversation', 500);
    }
  }
);

/**
 * POST /api/admin/conversation/[id]/delete
 * Permanent delete (expects { permanent: true } in body)
 */
export const POST = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const conversationId = parseInt(context.params.id || '0', 10);
      const body = (await context.request.json()) as { permanent?: boolean };

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      if (!body.permanent) {
        return createErrorResponse('Must specify permanent: true for permanent deletion', 400);
      }

      const repository = new D1ConversationRepository(d1);
      await repository.permanentDelete(conversationId);

      return createSuccessResponse({ deleted: true, permanent: true, conversationId });
    } catch (error) {
      console.error('[Conversation Permanent Delete Error]:', error);
      return createErrorResponse('Failed to permanently delete conversation', 500);
    }
  }
);
