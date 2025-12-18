/**
 * Engagement Analytics API
 * Identify most engaging conversations
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

interface EngagingConversation {
  id: number;
  userId: string;
  messageCount: number;
  userMessages: number;
  aiMessages: number;
  durationMinutes: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  engagementScore: number;
  preview: string | null;
}

/**
 * GET /api/admin/analytics/engagement
 * Get most engaging conversations sorted by various metrics
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const sortBy = url.searchParams.get('sort') || 'score'; // 'score', 'messages', 'duration'

      // Get conversation engagement data
      const result = await d1
        .prepare(`
          SELECT
            c.id,
            c.user_id,
            COUNT(m.id) as message_count,
            SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) as user_messages,
            SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) as ai_messages,
            MIN(m.created_at) as first_message_at,
            MAX(m.created_at) as last_message_at,
            (SELECT content FROM messages
             WHERE conversation_id = c.id AND role = 'user' AND deleted_at IS NULL
             ORDER BY created_at ASC LIMIT 1) as first_user_message
          FROM conversations c
          INNER JOIN messages m ON m.conversation_id = c.id
          WHERE m.deleted_at IS NULL
            AND c.deleted_at IS NULL
          GROUP BY c.id
          HAVING message_count >= 2
          ORDER BY message_count DESC
          LIMIT 100
        `)
        .all<{
          id: number;
          user_id: string;
          message_count: number;
          user_messages: number;
          ai_messages: number;
          first_message_at: string | null;
          last_message_at: string | null;
          first_user_message: string | null;
        }>();

      // Calculate engagement scores and additional metrics
      const conversations: EngagingConversation[] = result.results.map((row) => {
        // Calculate duration in minutes
        let durationMinutes = 0;
        if (row.first_message_at && row.last_message_at) {
          const first = new Date(row.first_message_at + 'Z');
          const last = new Date(row.last_message_at + 'Z');
          durationMinutes = Math.round((last.getTime() - first.getTime()) / 60000);
        }

        // Calculate engagement score
        // Factors: message count, back-and-forth ratio, duration
        const backAndForthRatio = Math.min(row.user_messages, row.ai_messages) /
          Math.max(row.user_messages, row.ai_messages, 1);
        const durationBonus = Math.min(durationMinutes / 10, 5); // Max 5 points for 50+ min
        const messageBonus = Math.min(row.message_count / 2, 10); // Max 10 points for 20+ messages

        const engagementScore = Math.round(
          (messageBonus + durationBonus + backAndForthRatio * 5) * 10
        ) / 10;

        return {
          id: row.id,
          userId: row.user_id,
          messageCount: row.message_count,
          userMessages: row.user_messages,
          aiMessages: row.ai_messages,
          durationMinutes,
          firstMessageAt: row.first_message_at,
          lastMessageAt: row.last_message_at,
          engagementScore,
          preview: row.first_user_message
            ? row.first_user_message.substring(0, 100) + (row.first_user_message.length > 100 ? '...' : '')
            : null,
        };
      });

      // Sort based on requested criteria
      const sorted = [...conversations].sort((a, b) => {
        switch (sortBy) {
          case 'messages':
            return b.messageCount - a.messageCount;
          case 'duration':
            return b.durationMinutes - a.durationMinutes;
          case 'score':
          default:
            return b.engagementScore - a.engagementScore;
        }
      }).slice(0, limit);

      // Calculate summary statistics
      const avgMessages = conversations.length > 0
        ? Math.round(conversations.reduce((sum, c) => sum + c.messageCount, 0) / conversations.length)
        : 0;
      const avgDuration = conversations.length > 0
        ? Math.round(conversations.reduce((sum, c) => sum + c.durationMinutes, 0) / conversations.length)
        : 0;
      const avgScore = conversations.length > 0
        ? Math.round(conversations.reduce((sum, c) => sum + c.engagementScore, 0) / conversations.length * 10) / 10
        : 0;

      return createSuccessResponse({
        conversations: sorted,
        stats: {
          totalAnalyzed: conversations.length,
          averageMessages: avgMessages,
          averageDuration: avgDuration,
          averageScore: avgScore,
        },
      });
    } catch (error) {
      console.error('[Engagement Analytics Error]:', error);
      return createErrorResponse('Failed to analyze engagement', 500);
    }
  }
);
