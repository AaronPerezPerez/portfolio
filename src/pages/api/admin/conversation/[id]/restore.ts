/**
 * Conversation Restore API
 * Restore a soft-deleted conversation
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
 * POST /api/admin/conversation/[id]/restore
 * Restore a soft-deleted conversation
 */
export const POST = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const conversationId = parseInt(context.params.id || '0', 10);

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      const repository = new D1ConversationRepository(d1);
      await repository.restore(conversationId);

      return createSuccessResponse({ restored: true, conversationId });
    } catch (error) {
      console.error('[Conversation Restore Error]:', error);
      return createErrorResponse('Failed to restore conversation', 500);
    }
  }
);
