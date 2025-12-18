/**
 * Conversation Tags API
 * Manage tags for a specific conversation
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../../infrastructure/http';
import { createDb, conversationTags, tags, eq, and, sql } from '../../../../../db';

export const prerender = false;

/**
 * GET /api/admin/conversation/[id]/tags
 * Get all tags for a conversation
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);
      const conversationId = parseInt(context.params.id || '0', 10);

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      // Get tags for this conversation
      const tagList = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
        })
        .from(conversationTags)
        .innerJoin(tags, eq(conversationTags.tagId, tags.id))
        .where(eq(conversationTags.conversationId, conversationId))
        .all();

      return createSuccessResponse({ tags: tagList });
    } catch (error) {
      console.error('[Conversation Tags Error]:', error);
      return createErrorResponse('Failed to fetch conversation tags', 500);
    }
  }
);

/**
 * POST /api/admin/conversation/[id]/tags
 * Add a tag to a conversation
 */
export const POST = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);
      const conversationId = parseInt(context.params.id || '0', 10);
      const body = (await context.request.json()) as { tagId?: number };

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      if (!body.tagId || typeof body.tagId !== 'number') {
        return createErrorResponse('Tag ID is required', 400);
      }

      // Check if tag exists
      const tag = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.id, body.tagId))
        .get();

      if (!tag) {
        return createErrorResponse('Tag not found', 404);
      }

      // Check if already assigned
      const existing = await db
        .select({ id: conversationTags.id })
        .from(conversationTags)
        .where(
          and(
            eq(conversationTags.conversationId, conversationId),
            eq(conversationTags.tagId, body.tagId)
          )
        )
        .get();

      if (existing) {
        return createErrorResponse('Tag already assigned to this conversation', 409);
      }

      // Add tag to conversation
      await db.insert(conversationTags).values({
        conversationId,
        tagId: body.tagId,
      });

      return createSuccessResponse({ success: true }, 201);
    } catch (error) {
      console.error('[Add Conversation Tag Error]:', error);
      return createErrorResponse('Failed to add tag', 500);
    }
  }
);

/**
 * DELETE /api/admin/conversation/[id]/tags
 * Remove a tag from a conversation
 */
export const DELETE = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const db = createDb(d1);
      const conversationId = parseInt(context.params.id || '0', 10);
      const body = (await context.request.json()) as { tagId?: number };

      if (!conversationId) {
        return createErrorResponse('Invalid conversation ID', 400);
      }

      if (!body.tagId || typeof body.tagId !== 'number') {
        return createErrorResponse('Tag ID is required', 400);
      }

      // Remove tag from conversation
      await db
        .delete(conversationTags)
        .where(
          and(
            eq(conversationTags.conversationId, conversationId),
            eq(conversationTags.tagId, body.tagId)
          )
        );

      return createSuccessResponse({ success: true });
    } catch (error) {
      console.error('[Remove Conversation Tag Error]:', error);
      return createErrorResponse('Failed to remove tag', 500);
    }
  }
);
