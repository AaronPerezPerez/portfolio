/**
 * Spam Scan API
 * Scan conversations for spam and flag suspicious ones
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';
import { SpamDetector } from '../../../../application/moderation';

export const prerender = false;

/**
 * POST /api/admin/moderation/scan
 * Scan all conversations for spam and flag suspicious ones
 */
export const POST = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      // Get all non-deleted conversations with their messages
      const conversationsResult = await d1
        .prepare(`
          SELECT
            c.id,
            c.user_id,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) as message_count
          FROM conversations c
          WHERE c.deleted_at IS NULL
          ORDER BY c.id DESC
          LIMIT 100
        `)
        .all<{
          id: number;
          user_id: string;
          message_count: number;
        }>();

      let scanned = 0;
      let flagged = 0;
      const newFlags: Array<{ conversationId: number; reason: string; severity: string }> = [];

      for (const conv of conversationsResult.results) {
        // Skip conversations with no messages
        if (conv.message_count === 0) continue;

        // Check if already flagged and not reviewed
        const existingFlag = await d1
          .prepare('SELECT id FROM flagged_conversations WHERE conversation_id = ? AND reviewed = 0')
          .bind(conv.id)
          .first();

        if (existingFlag) continue;

        // Get messages for this conversation
        const messagesResult = await d1
          .prepare(`
            SELECT role, content, created_at
            FROM messages
            WHERE conversation_id = ?
              AND deleted_at IS NULL
            ORDER BY created_at ASC
          `)
          .bind(conv.id)
          .all<{ role: string; content: string; created_at: string }>();

        const messages = messagesResult.results.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        }));

        // Analyze for spam
        const result = SpamDetector.analyzeConversation(messages);
        scanned++;

        if (result.isSpam) {
          // Flag the conversation
          await d1
            .prepare(`
              INSERT INTO flagged_conversations (conversation_id, reason, severity, details)
              VALUES (?, ?, ?, ?)
            `)
            .bind(
              conv.id,
              result.reason,
              result.severity,
              JSON.stringify(result.details)
            )
            .run();

          flagged++;
          newFlags.push({
            conversationId: conv.id,
            reason: SpamDetector.getReasonDescription(result.reason),
            severity: result.severity,
          });
        }
      }

      return createSuccessResponse({
        message: `Scan complete: ${scanned} conversations scanned, ${flagged} flagged`,
        scanned,
        flagged,
        newFlags,
      });
    } catch (error) {
      console.error('[Spam Scan Error]:', error);
      return createErrorResponse('Failed to scan for spam', 500);
    }
  }
);
