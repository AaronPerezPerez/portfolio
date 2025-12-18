/**
 * Admin Conversation Detail API
 * Gets a single conversation with its messages
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
  parseIdParam,
} from '../../../../infrastructure/http';
import { D1ConversationRepository } from '../../../../infrastructure/persistence';

export const prerender = false;

export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, db: D1Database) => {
    // Parse and validate ID parameter
    const idResult = parseIdParam(context);

    if ('error' in idResult) {
      return createErrorResponse(idResult.error, 400);
    }

    try {
      const repository = new D1ConversationRepository(db);
      const detail = await repository.getDetail(idResult.id);

      if (!detail) {
        return createErrorResponse('Conversation not found', 404);
      }

      return createSuccessResponse({
        conversation: {
          id: detail.conversation.id,
          user_id: detail.conversation.userId,
          created_at: detail.conversation.createdAt,
          updated_at: detail.conversation.updatedAt,
        },
        messages: detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.createdAt,
        })),
      });
    } catch (error) {
      console.error('[Admin Conversation Detail Error]:', error);
      return createErrorResponse('Failed to fetch conversation', 500);
    }
  }
);
