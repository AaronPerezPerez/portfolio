/**
 * Bulk Conversations API
 * Perform bulk operations on multiple conversations
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';
import { D1ConversationRepository } from '../../../../infrastructure/persistence';

export const prerender = false;

type BulkAction = 'delete' | 'tag' | 'untag' | 'export';

interface BulkRequestBody {
  ids: number[];
  action: BulkAction;
  tagId?: number; // Required for 'tag' and 'untag' actions
}

interface BulkResult {
  success: number[];
  failed: number[];
  data?: unknown; // For export action
}

/**
 * POST /api/admin/conversations/bulk
 * Perform bulk operations on conversations
 */
export const POST = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const body = (await context.request.json()) as BulkRequestBody;
      const { ids, action, tagId } = body;

      // Validate request
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return createErrorResponse('No conversation IDs provided', 400);
      }

      if (!action || !['delete', 'tag', 'untag', 'export'].includes(action)) {
        return createErrorResponse('Invalid action. Must be: delete, tag, untag, or export', 400);
      }

      if ((action === 'tag' || action === 'untag') && !tagId) {
        return createErrorResponse('tagId is required for tag/untag actions', 400);
      }

      // Limit bulk operations to prevent abuse
      const MAX_BULK_SIZE = 100;
      if (ids.length > MAX_BULK_SIZE) {
        return createErrorResponse(`Cannot process more than ${MAX_BULK_SIZE} items at once`, 400);
      }

      const repository = new D1ConversationRepository(d1);
      const result: BulkResult = { success: [], failed: [] };

      switch (action) {
        case 'delete':
          for (const id of ids) {
            try {
              await repository.softDelete(id);
              result.success.push(id);
            } catch {
              result.failed.push(id);
            }
          }
          break;

        case 'tag':
          for (const id of ids) {
            try {
              // Check if tag already exists
              const existing = await d1
                .prepare(
                  'SELECT id FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?'
                )
                .bind(id, tagId)
                .first();

              if (!existing) {
                await d1
                  .prepare(
                    'INSERT INTO conversation_tags (conversation_id, tag_id) VALUES (?, ?)'
                  )
                  .bind(id, tagId)
                  .run();
              }
              result.success.push(id);
            } catch {
              result.failed.push(id);
            }
          }
          break;

        case 'untag':
          for (const id of ids) {
            try {
              await d1
                .prepare(
                  'DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?'
                )
                .bind(id, tagId)
                .run();
              result.success.push(id);
            } catch {
              result.failed.push(id);
            }
          }
          break;

        case 'export':
          const exportData = [];
          for (const id of ids) {
            try {
              const detail = await repository.getDetail(id);
              if (detail) {
                exportData.push({
                  id: detail.conversation.id,
                  userId: detail.conversation.userId,
                  createdAt: detail.conversation.createdAt,
                  messageCount: detail.conversation.messageCount,
                  messages: detail.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    createdAt: m.createdAt,
                  })),
                });
                result.success.push(id);
              } else {
                result.failed.push(id);
              }
            } catch {
              result.failed.push(id);
            }
          }
          result.data = exportData;
          break;
      }

      return createSuccessResponse({
        action,
        result: {
          total: ids.length,
          success: result.success.length,
          failed: result.failed.length,
          successIds: result.success,
          failedIds: result.failed,
          ...(action === 'export' && { data: result.data }),
        },
      });
    } catch (error) {
      console.error('[Bulk Operations Error]:', error);
      return createErrorResponse('Failed to perform bulk operation', 500);
    }
  }
);
