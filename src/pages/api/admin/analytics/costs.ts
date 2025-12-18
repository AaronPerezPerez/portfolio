/**
 * Cost Analytics API
 * Calculate costs based on token usage
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

// Cost per token (Cloudflare AI pricing)
// Qwen3-30B: approximately $0.00001 per token (adjust based on actual pricing)
const COST_PER_TOKEN = 0.00001;

interface DailyCost {
  date: string;
  tokens: number;
  cost: number;
  messageCount: number;
}

interface CostSummary {
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
  avgTokensPerMessage: number;
  avgCostPerConversation: number;
  conversationsWithCost: number;
}

/**
 * GET /api/admin/analytics/costs
 * Get cost analytics based on token usage
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const days = parseInt(url.searchParams.get('days') || '30', 10);

      // Get daily token usage
      const dailyResult = await d1
        .prepare(`
          SELECT
            date(m.created_at) as date,
            SUM(COALESCE(m.tokens_used, 0)) as tokens,
            COUNT(m.id) as message_count
          FROM messages m
          INNER JOIN conversations c ON m.conversation_id = c.id
          WHERE m.role = 'assistant'
            AND m.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND m.created_at > datetime('now', '-' || ? || ' days')
          GROUP BY date(m.created_at)
          ORDER BY date ASC
        `)
        .bind(days)
        .all<{
          date: string;
          tokens: number;
          message_count: number;
        }>();

      // Fill missing dates and calculate costs
      const dailyCosts: DailyCost[] = fillMissingDates(
        dailyResult.results.map((row) => ({
          date: row.date,
          tokens: row.tokens || 0,
          cost: (row.tokens || 0) * COST_PER_TOKEN,
          messageCount: row.message_count,
        })),
        days
      );

      // Get total summary
      const summaryResult = await d1
        .prepare(`
          SELECT
            SUM(COALESCE(m.tokens_used, 0)) as total_tokens,
            COUNT(m.id) as total_messages,
            COUNT(DISTINCT c.id) as conversation_count
          FROM messages m
          INNER JOIN conversations c ON m.conversation_id = c.id
          WHERE m.role = 'assistant'
            AND m.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND m.created_at > datetime('now', '-' || ? || ' days')
        `)
        .bind(days)
        .first<{
          total_tokens: number;
          total_messages: number;
          conversation_count: number;
        }>();

      const totalTokens = summaryResult?.total_tokens || 0;
      const totalMessages = summaryResult?.total_messages || 0;
      const conversationCount = summaryResult?.conversation_count || 0;

      const summary: CostSummary = {
        totalTokens,
        totalCost: totalTokens * COST_PER_TOKEN,
        totalMessages,
        avgTokensPerMessage: totalMessages > 0
          ? Math.round(totalTokens / totalMessages)
          : 0,
        avgCostPerConversation: conversationCount > 0
          ? Math.round((totalTokens * COST_PER_TOKEN / conversationCount) * 10000) / 10000
          : 0,
        conversationsWithCost: conversationCount,
      };

      // Get top conversations by cost
      const topConversations = await d1
        .prepare(`
          SELECT
            c.id,
            c.user_id,
            SUM(COALESCE(m.tokens_used, 0)) as tokens,
            COUNT(m.id) as message_count
          FROM conversations c
          INNER JOIN messages m ON m.conversation_id = c.id
          WHERE m.role = 'assistant'
            AND m.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND m.tokens_used > 0
          GROUP BY c.id
          ORDER BY tokens DESC
          LIMIT 10
        `)
        .all<{
          id: number;
          user_id: string;
          tokens: number;
          message_count: number;
        }>();

      return createSuccessResponse({
        daily: dailyCosts,
        summary,
        topConversations: topConversations.results.map((c) => ({
          id: c.id,
          userId: c.user_id,
          tokens: c.tokens,
          cost: c.tokens * COST_PER_TOKEN,
          messageCount: c.message_count,
        })),
        costPerToken: COST_PER_TOKEN,
      });
    } catch (error) {
      console.error('[Cost Analytics Error]:', error);
      return createErrorResponse('Failed to calculate costs', 500);
    }
  }
);

/**
 * Fill missing dates with zero values
 */
function fillMissingDates(
  data: DailyCost[],
  days: number
): DailyCost[] {
  const result: DailyCost[] = [];
  const dataMap = new Map(data.map((d) => [d.date, d]));

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    result.push(
      dataMap.get(dateStr) || {
        date: dateStr,
        tokens: 0,
        cost: 0,
        messageCount: 0,
      }
    );
  }

  return result;
}
