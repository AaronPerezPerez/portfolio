/**
 * Flagged Conversations API
 * View and manage flagged conversations for moderation
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

interface FlaggedEntry {
  id: number;
  conversationId: number;
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown> | null;
  reviewed: boolean;
  reviewedAt: string | null;
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
}

/**
 * GET /api/admin/moderation/flagged
 * Get flagged conversations
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const showReviewed = url.searchParams.get('reviewed') === 'true';
      const severity = url.searchParams.get('severity');

      let whereClause = showReviewed ? '' : 'WHERE f.reviewed = 0';

      if (severity) {
        whereClause += whereClause ? ` AND f.severity = '${severity}'` : `WHERE f.severity = '${severity}'`;
      }

      const result = await d1
        .prepare(`
          SELECT
            f.id,
            f.conversation_id,
            c.user_id,
            f.reason,
            f.severity,
            f.details,
            f.reviewed,
            f.reviewed_at,
            f.created_at,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) as message_count,
            (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message
          FROM flagged_conversations f
          INNER JOIN conversations c ON f.conversation_id = c.id
          ${whereClause}
          ORDER BY
            CASE f.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            f.created_at DESC
          LIMIT 50
        `)
        .all<{
          id: number;
          conversation_id: number;
          user_id: string;
          reason: string;
          severity: 'low' | 'medium' | 'high';
          details: string | null;
          reviewed: number;
          reviewed_at: string | null;
          created_at: string;
          message_count: number;
          last_message: string | null;
        }>();

      const flagged: FlaggedEntry[] = result.results.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        reason: row.reason,
        severity: row.severity,
        details: row.details ? JSON.parse(row.details) : null,
        reviewed: row.reviewed === 1,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        messageCount: row.message_count,
        lastMessage: row.last_message,
      }));

      // Get summary stats
      const statsResult = await d1
        .prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN reviewed = 0 THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN severity = 'high' AND reviewed = 0 THEN 1 ELSE 0 END) as high_priority
          FROM flagged_conversations
        `)
        .first<{
          total: number;
          pending: number;
          high_priority: number;
        }>();

      return createSuccessResponse({
        flagged,
        stats: {
          total: statsResult?.total || 0,
          pending: statsResult?.pending || 0,
          highPriority: statsResult?.high_priority || 0,
        },
      });
    } catch (error) {
      console.error('[Flagged Conversations Error]:', error);
      return createErrorResponse('Failed to get flagged conversations', 500);
    }
  }
);

/**
 * PUT /api/admin/moderation/flagged
 * Mark a flagged conversation as reviewed
 */
export const PUT = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const body = await context.request.json() as { id: number; action: 'approve' | 'dismiss' };

      if (!body.id || !body.action) {
        return createErrorResponse('ID and action are required', 400);
      }

      await d1
        .prepare(`
          UPDATE flagged_conversations
          SET reviewed = 1, reviewed_at = datetime('now')
          WHERE id = ?
        `)
        .bind(body.id)
        .run();

      return createSuccessResponse({
        message: `Flag ${body.action === 'approve' ? 'approved' : 'dismissed'}`,
      });
    } catch (error) {
      console.error('[Update Flag Error]:', error);
      return createErrorResponse('Failed to update flag', 500);
    }
  }
);
