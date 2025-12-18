/**
 * Admin Search API
 * Global search across conversations and messages
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../infrastructure/http';
import { createDb, sql } from '../../../db';

export const prerender = false;

interface SearchResult {
  conversationId: number;
  messageId: number;
  userId: string;
  role: string;
  content: string;
  createdAt: string | null;
  highlight: string;
}

export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q')?.trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    if (!query || query.length < 2) {
      return createErrorResponse('Search query must be at least 2 characters', 400);
    }

    try {
      const db = createDb(d1);

      // Sanitize query for LIKE pattern
      const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
      const likePattern = `%${sanitizedQuery}%`;

      // Search in messages content
      const results = await db.all<{
        conversation_id: number;
        message_id: number;
        user_id: string;
        role: string;
        content: string;
        created_at: string | null;
      }>(sql`
        SELECT
          m.conversation_id,
          m.id as message_id,
          c.user_id,
          m.role,
          m.content,
          m.created_at
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE m.deleted_at IS NULL
          AND m.content LIKE ${likePattern}
        ORDER BY m.created_at DESC
        LIMIT ${limit + 1}
        OFFSET ${offset}
      `);

      // Check if there are more results
      const hasMore = results.length > limit;
      const items = results.slice(0, limit);

      // Get total count for pagination info
      const countResult = await db.get<{ total: number }>(sql`
        SELECT COUNT(*) as total
        FROM messages m
        WHERE m.deleted_at IS NULL
          AND m.content LIKE ${likePattern}
      `);

      // Format results with highlighting
      const searchResults: SearchResult[] = items.map((r) => ({
        conversationId: r.conversation_id,
        messageId: r.message_id,
        userId: r.user_id,
        role: r.role,
        content: r.content,
        createdAt: r.created_at,
        highlight: highlightMatch(r.content, query),
      }));

      return createSuccessResponse({
        results: searchResults,
        pagination: {
          page,
          limit,
          total: countResult?.total ?? 0,
          hasMore,
        },
        query,
      });
    } catch (error) {
      console.error('[Admin Search Error]:', error);
      return createErrorResponse('Search failed', 500);
    }
  }
);

/**
 * Highlight matching text in content
 */
function highlightMatch(content: string, query: string): string {
  // Get surrounding context (max 100 chars on each side)
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }

  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + query.length + 50);

  let excerpt = '';
  if (start > 0) excerpt += '...';
  excerpt += content.substring(start, end);
  if (end < content.length) excerpt += '...';

  // Wrap match in markers (frontend will style these)
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return excerpt.replace(regex, '[[MATCH]]$1[[/MATCH]]');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
