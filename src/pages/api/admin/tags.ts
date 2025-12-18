/**
 * Admin Tags API
 * CRUD operations for conversation tags
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../infrastructure/http';
import { createDb, tags, sql, eq } from '../../../db';

export const prerender = false;

// Default tags to seed if none exist
const DEFAULT_TAGS = [
  { name: 'Lead', color: '#22c55e' },
  { name: 'Spam', color: '#ef4444' },
  { name: 'Interesting', color: '#3b82f6' },
  { name: 'Follow-up', color: '#f59e0b' },
];

/**
 * GET /api/admin/tags
 * List all tags
 */
export const GET = withAdminAuthAndDatabase(
  async (_context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);

      // Get all tags
      const tagList = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        })
        .from(tags)
        .orderBy(tags.name)
        .all();

      // If no tags exist, seed default tags
      if (tagList.length === 0) {
        for (const tag of DEFAULT_TAGS) {
          await db.insert(tags).values(tag);
        }

        // Re-fetch after seeding
        const seededTags = await db
          .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
            createdAt: tags.createdAt,
          })
          .from(tags)
          .orderBy(tags.name)
          .all();

        return createSuccessResponse({ tags: seededTags });
      }

      return createSuccessResponse({ tags: tagList });
    } catch (error) {
      console.error('[Admin Tags Error]:', error);
      return createErrorResponse('Failed to fetch tags', 500);
    }
  }
);

/**
 * POST /api/admin/tags
 * Create a new tag
 */
export const POST = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);
      const body = (await context.request.json()) as { name?: string; color?: string };

      const name = body.name?.trim();
      const color = body.color?.trim() || '#00ffff';

      if (!name || name.length < 1 || name.length > 50) {
        return createErrorResponse('Tag name must be between 1 and 50 characters', 400);
      }

      // Validate color format (hex)
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return createErrorResponse('Invalid color format. Use hex format like #00ffff', 400);
      }

      // Check if tag already exists
      const existing = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, name))
        .get();

      if (existing) {
        return createErrorResponse('Tag with this name already exists', 409);
      }

      // Create tag
      const result = await db
        .insert(tags)
        .values({ name, color })
        .returning({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        });

      return createSuccessResponse({ tag: result[0] }, 201);
    } catch (error) {
      console.error('[Admin Tags Create Error]:', error);
      return createErrorResponse('Failed to create tag', 500);
    }
  }
);

/**
 * DELETE /api/admin/tags
 * Delete a tag (expects { id } in body)
 */
export const DELETE = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);
      const body = (await context.request.json()) as { id?: number };

      if (!body.id || typeof body.id !== 'number') {
        return createErrorResponse('Tag ID is required', 400);
      }

      // Delete tag (cascade will handle conversation_tags)
      await db.delete(tags).where(eq(tags.id, body.id));

      return createSuccessResponse({ deleted: true });
    } catch (error) {
      console.error('[Admin Tags Delete Error]:', error);
      return createErrorResponse('Failed to delete tag', 500);
    }
  }
);
