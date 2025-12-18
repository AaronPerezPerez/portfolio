/**
 * Temperature Configuration API
 * GET - Retrieve current temperature setting
 * PUT - Update temperature setting
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';

export const prerender = false;

const CONFIG_KEY = 'temperature';
const DEFAULT_TEMPERATURE = 0.5;
const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 1;

/**
 * GET /api/admin/config/temperature
 * Get current temperature configuration
 */
export const GET = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      const result = await d1
        .prepare('SELECT value, updated_at FROM config WHERE key = ?')
        .bind(CONFIG_KEY)
        .first<{ value: string; updated_at: string }>();

      if (result) {
        return createSuccessResponse({
          temperature: parseFloat(result.value),
          updatedAt: result.updated_at,
          isDefault: false,
          default: DEFAULT_TEMPERATURE,
          min: MIN_TEMPERATURE,
          max: MAX_TEMPERATURE,
        });
      }

      return createSuccessResponse({
        temperature: DEFAULT_TEMPERATURE,
        updatedAt: null,
        isDefault: true,
        default: DEFAULT_TEMPERATURE,
        min: MIN_TEMPERATURE,
        max: MAX_TEMPERATURE,
      });
    } catch (error) {
      console.error('[Config Temperature GET Error]:', error);
      return createErrorResponse('Failed to get temperature', 500);
    }
  }
);

/**
 * PUT /api/admin/config/temperature
 * Update temperature configuration
 */
export const PUT = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const body = await context.request.json() as { temperature: number };

      if (body.temperature === undefined || typeof body.temperature !== 'number') {
        return createErrorResponse('Temperature is required and must be a number', 400);
      }

      const temperature = Math.round(body.temperature * 100) / 100; // Round to 2 decimal places

      if (temperature < MIN_TEMPERATURE || temperature > MAX_TEMPERATURE) {
        return createErrorResponse(
          `Temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`,
          400
        );
      }

      // Get current value for history
      const current = await d1
        .prepare('SELECT value FROM config WHERE key = ?')
        .bind(CONFIG_KEY)
        .first<{ value: string }>();

      // Insert or update config
      await d1
        .prepare(`
          INSERT INTO config (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')
        `)
        .bind(CONFIG_KEY, temperature.toString())
        .run();

      // Save history
      await d1
        .prepare(`
          INSERT INTO config_history (config_key, old_value, new_value, changed_at)
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(CONFIG_KEY, current?.value || DEFAULT_TEMPERATURE.toString(), temperature.toString())
        .run();

      return createSuccessResponse({
        message: 'Temperature updated successfully',
        temperature,
      });
    } catch (error) {
      console.error('[Config Temperature PUT Error]:', error);
      return createErrorResponse('Failed to update temperature', 500);
    }
  }
);

/**
 * DELETE /api/admin/config/temperature
 * Reset to default temperature
 */
export const DELETE = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      const current = await d1
        .prepare('SELECT value FROM config WHERE key = ?')
        .bind(CONFIG_KEY)
        .first<{ value: string }>();

      if (current) {
        await d1
          .prepare(`
            INSERT INTO config_history (config_key, old_value, new_value, changed_at)
            VALUES (?, ?, '[RESET TO DEFAULT]', datetime('now'))
          `)
          .bind(CONFIG_KEY, current.value)
          .run();

        await d1
          .prepare('DELETE FROM config WHERE key = ?')
          .bind(CONFIG_KEY)
          .run();
      }

      return createSuccessResponse({
        message: 'Temperature reset to default',
        temperature: DEFAULT_TEMPERATURE,
      });
    } catch (error) {
      console.error('[Config Temperature DELETE Error]:', error);
      return createErrorResponse('Failed to reset temperature', 500);
    }
  }
);
