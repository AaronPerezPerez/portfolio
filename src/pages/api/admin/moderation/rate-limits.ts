/**
 * Rate Limit Logs API
 * View rate limiting events and statistics
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

interface RateLimitEntry {
  id: number;
  ip: string;
  userId: string | null;
  blocked: boolean;
  endpoint: string;
  createdAt: string;
}

interface HourlyStats {
  hour: string;
  total: number;
  blocked: number;
}

/**
 * GET /api/admin/moderation/rate-limits
 * Get rate limit logs and statistics
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const blockedOnly = url.searchParams.get('blocked') === 'true';

      // Get recent rate limit events
      let query = `
        SELECT id, ip, user_id, blocked, endpoint, created_at
        FROM rate_limit_logs
      `;

      if (blockedOnly) {
        query += ` WHERE blocked = 1`;
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;

      const logsResult = await d1
        .prepare(query)
        .bind(limit)
        .all<{
          id: number;
          ip: string;
          user_id: string | null;
          blocked: number;
          endpoint: string;
          created_at: string;
        }>();

      const logs: RateLimitEntry[] = logsResult.results.map((row) => ({
        id: row.id,
        ip: row.ip,
        userId: row.user_id,
        blocked: row.blocked === 1,
        endpoint: row.endpoint,
        createdAt: row.created_at,
      }));

      // Get hourly statistics (last 24 hours)
      const hourlyResult = await d1
        .prepare(`
          SELECT
            strftime('%Y-%m-%d %H:00', created_at) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked
          FROM rate_limit_logs
          WHERE created_at > datetime('now', '-24 hours')
          GROUP BY hour
          ORDER BY hour ASC
        `)
        .all<{
          hour: string;
          total: number;
          blocked: number;
        }>();

      // Get top blocked IPs
      const topBlockedResult = await d1
        .prepare(`
          SELECT ip, COUNT(*) as block_count
          FROM rate_limit_logs
          WHERE blocked = 1
            AND created_at > datetime('now', '-7 days')
          GROUP BY ip
          ORDER BY block_count DESC
          LIMIT 10
        `)
        .all<{ ip: string; block_count: number }>();

      // Get summary stats
      const statsResult = await d1
        .prepare(`
          SELECT
            COUNT(*) as total_events,
            SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as total_blocked,
            COUNT(DISTINCT ip) as unique_ips
          FROM rate_limit_logs
          WHERE created_at > datetime('now', '-24 hours')
        `)
        .first<{
          total_events: number;
          total_blocked: number;
          unique_ips: number;
        }>();

      return createSuccessResponse({
        logs,
        hourly: hourlyResult.results,
        topBlocked: topBlockedResult.results,
        stats: {
          totalEvents: statsResult?.total_events || 0,
          totalBlocked: statsResult?.total_blocked || 0,
          uniqueIPs: statsResult?.unique_ips || 0,
          blockRate: statsResult?.total_events
            ? Math.round((statsResult.total_blocked / statsResult.total_events) * 100)
            : 0,
        },
      });
    } catch (error) {
      console.error('[Rate Limits Error]:', error);
      return createErrorResponse('Failed to get rate limit logs', 500);
    }
  }
);
