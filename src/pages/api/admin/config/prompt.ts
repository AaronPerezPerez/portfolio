/**
 * System Prompt Configuration API
 * GET - Retrieve current system prompt
 * PUT - Update system prompt
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';
import { SystemPromptBuilder } from '../../../../application/chat/SystemPromptBuilder';

export const prerender = false;

const CONFIG_KEY = 'system_prompt';

/**
 * GET /api/admin/config/prompt
 * Get current system prompt configuration
 */
export const GET = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      // Get current config from database
      const result = await d1
        .prepare('SELECT value, updated_at FROM config WHERE key = ?')
        .bind(CONFIG_KEY)
        .first<{ value: string; updated_at: string }>();

      // Get default prompt for comparison
      const defaultPrompt = SystemPromptBuilder.getDefaultPrompt();

      if (result) {
        return createSuccessResponse({
          prompt: result.value,
          updatedAt: result.updated_at,
          isDefault: false,
          defaultPrompt,
        });
      }

      // No custom prompt, return default
      return createSuccessResponse({
        prompt: defaultPrompt,
        updatedAt: null,
        isDefault: true,
        defaultPrompt,
      });
    } catch (error) {
      console.error('[Config Prompt GET Error]:', error);
      return createErrorResponse('Failed to get system prompt', 500);
    }
  }
);

/**
 * PUT /api/admin/config/prompt
 * Update system prompt configuration
 */
export const PUT = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const body = await context.request.json() as { prompt: string };

      if (!body.prompt || typeof body.prompt !== 'string') {
        return createErrorResponse('Prompt is required', 400);
      }

      const prompt = body.prompt.trim();

      if (prompt.length < 50) {
        return createErrorResponse('Prompt must be at least 50 characters', 400);
      }

      if (prompt.length > 10000) {
        return createErrorResponse('Prompt must be less than 10,000 characters', 400);
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
        .bind(CONFIG_KEY, prompt)
        .run();

      // Save history
      await d1
        .prepare(`
          INSERT INTO config_history (config_key, old_value, new_value, changed_at)
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(CONFIG_KEY, current?.value || null, prompt)
        .run();

      return createSuccessResponse({
        message: 'System prompt updated successfully',
        prompt,
      });
    } catch (error) {
      console.error('[Config Prompt PUT Error]:', error);
      return createErrorResponse('Failed to update system prompt', 500);
    }
  }
);

/**
 * DELETE /api/admin/config/prompt
 * Reset to default system prompt
 */
export const DELETE = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      // Get current value for history
      const current = await d1
        .prepare('SELECT value FROM config WHERE key = ?')
        .bind(CONFIG_KEY)
        .first<{ value: string }>();

      if (current) {
        // Save history before deleting
        await d1
          .prepare(`
            INSERT INTO config_history (config_key, old_value, new_value, changed_at)
            VALUES (?, ?, '[RESET TO DEFAULT]', datetime('now'))
          `)
          .bind(CONFIG_KEY, current.value)
          .run();

        // Delete custom config
        await d1
          .prepare('DELETE FROM config WHERE key = ?')
          .bind(CONFIG_KEY)
          .run();
      }

      return createSuccessResponse({
        message: 'System prompt reset to default',
        prompt: SystemPromptBuilder.getDefaultPrompt(),
      });
    } catch (error) {
      console.error('[Config Prompt DELETE Error]:', error);
      return createErrorResponse('Failed to reset system prompt', 500);
    }
  }
);
