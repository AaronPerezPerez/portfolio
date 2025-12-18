/**
 * Admin Analytics - Activity
 * Returns message count per day for the last 30 days
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';
import { createDb, sql } from '../../../../db';

export const prerender = false;

export const GET = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);

      // Get messages per day for last 30 days
      const activity = await db.all(sql`
        SELECT
          date(created_at) as date,
          COUNT(*) as count
        FROM messages
        WHERE
          deleted_at IS NULL
          AND created_at > datetime('now', '-30 days')
        GROUP BY date(created_at)
        ORDER BY date ASC
      `);

      // Fill in missing dates with 0
      const filledActivity = fillMissingDates(
        activity as { date: string; count: number }[],
        30
      );

      return createSuccessResponse({ activity: filledActivity });
    } catch (error) {
      console.error('[Analytics Activity Error]:', error);
      return createErrorResponse('Failed to fetch activity data', 500);
    }
  }
);

// Fill missing dates with 0 count
function fillMissingDates(
  data: { date: string; count: number }[],
  days: number
) {
  const result: { date: string; count: number }[] = [];
  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0,
    });
  }

  return result;
}
