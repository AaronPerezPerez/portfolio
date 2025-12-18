/**
 * Config History API
 * GET - Retrieve configuration change history
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

interface HistoryEntry {
  id: number;
  configKey: string;
  oldValue: string | null;
  newValue: string;
  changedAt: string;
}

/**
 * GET /api/admin/config/history
 * Get configuration change history
 * Query params:
 *   - key: Filter by config key (optional)
 *   - limit: Number of entries (default 20)
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const key = url.searchParams.get('key');
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);

      let query: string;
      let params: (string | number)[];

      if (key) {
        query = `
          SELECT id, config_key, old_value, new_value, changed_at
          FROM config_history
          WHERE config_key = ?
          ORDER BY changed_at DESC
          LIMIT ?
        `;
        params = [key, limit];
      } else {
        query = `
          SELECT id, config_key, old_value, new_value, changed_at
          FROM config_history
          ORDER BY changed_at DESC
          LIMIT ?
        `;
        params = [limit];
      }

      const result = await d1
        .prepare(query)
        .bind(...params)
        .all<{
          id: number;
          config_key: string;
          old_value: string | null;
          new_value: string;
          changed_at: string;
        }>();

      const history: HistoryEntry[] = result.results.map((row) => ({
        id: row.id,
        configKey: row.config_key,
        oldValue: row.old_value,
        newValue: row.new_value,
        changedAt: row.changed_at,
      }));

      return createSuccessResponse({
        history,
        total: history.length,
      });
    } catch (error) {
      console.error('[Config History Error]:', error);
      return createErrorResponse('Failed to get config history', 500);
    }
  }
);
