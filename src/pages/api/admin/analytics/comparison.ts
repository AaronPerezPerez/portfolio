/**
 * Temporal Comparison Analytics API
 * Compare current period metrics vs previous period
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

interface PeriodMetrics {
  conversations: number;
  messages: number;
  users: number;
  avgMessagesPerConversation: number;
}

interface ComparisonResult {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  changes: {
    conversations: number;
    messages: number;
    users: number;
    avgMessagesPerConversation: number;
  };
  period: {
    days: number;
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
}

/**
 * GET /api/admin/analytics/comparison
 * Compare metrics between current period and previous period
 * Query params:
 *   - days: Number of days for comparison period (default: 7)
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const days = Math.min(
        Math.max(parseInt(url.searchParams.get('days') || '7', 10), 1),
        90
      );

      // Calculate date ranges
      const now = new Date();
      const currentEnd = now.toISOString().split('T')[0];

      const currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - days);
      const currentStart = currentStartDate.toISOString().split('T')[0];

      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const previousEnd = previousEndDate.toISOString().split('T')[0];

      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - days + 1);
      const previousStart = previousStartDate.toISOString().split('T')[0];

      // Fetch current period metrics
      const currentMetrics = await fetchPeriodMetrics(d1, currentStart, currentEnd);

      // Fetch previous period metrics
      const previousMetrics = await fetchPeriodMetrics(d1, previousStart, previousEnd);

      // Calculate percentage changes
      const changes = {
        conversations: calculateChange(currentMetrics.conversations, previousMetrics.conversations),
        messages: calculateChange(currentMetrics.messages, previousMetrics.messages),
        users: calculateChange(currentMetrics.users, previousMetrics.users),
        avgMessagesPerConversation: calculateChange(
          currentMetrics.avgMessagesPerConversation,
          previousMetrics.avgMessagesPerConversation
        ),
      };

      const result: ComparisonResult = {
        current: currentMetrics,
        previous: previousMetrics,
        changes,
        period: {
          days,
          currentStart,
          currentEnd,
          previousStart,
          previousEnd,
        },
      };

      return createSuccessResponse(result);
    } catch (error) {
      console.error('[Comparison Analytics Error]:', error);
      return createErrorResponse('Failed to calculate comparison', 500);
    }
  }
);

/**
 * Fetch metrics for a given date range
 */
async function fetchPeriodMetrics(
  d1: D1Database,
  startDate: string,
  endDate: string
): Promise<PeriodMetrics> {
  // Get conversation and message counts
  const statsResult = await d1
    .prepare(`
      SELECT
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(m.id) as message_count,
        COUNT(DISTINCT c.user_id) as user_count
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
        AND m.deleted_at IS NULL
        AND date(m.created_at) BETWEEN ? AND ?
      WHERE c.deleted_at IS NULL
        AND date(c.created_at) BETWEEN ? AND ?
    `)
    .bind(startDate, endDate, startDate, endDate)
    .first<{
      conversation_count: number;
      message_count: number;
      user_count: number;
    }>();

  const conversations = statsResult?.conversation_count || 0;
  const messages = statsResult?.message_count || 0;
  const users = statsResult?.user_count || 0;

  return {
    conversations,
    messages,
    users,
    avgMessagesPerConversation: conversations > 0
      ? Math.round((messages / conversations) * 10) / 10
      : 0,
  };
}

/**
 * Calculate percentage change between two values
 * Returns change as a percentage (positive or negative)
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
