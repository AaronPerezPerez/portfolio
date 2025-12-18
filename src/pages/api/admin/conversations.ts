/**
 * Admin Conversations API
 * Lists all conversations with stats and optional filters
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../infrastructure/http';
import {
  D1ConversationRepository,
  type ConversationFilters,
} from '../../../infrastructure/persistence';

export const prerender = false;

export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, db: D1Database) => {
    try {
      const repository = new D1ConversationRepository(db);
      const url = new URL(context.request.url);

      // Parse filter parameters
      const dateFrom = url.searchParams.get('dateFrom') || undefined;
      const dateTo = url.searchParams.get('dateTo') || undefined;
      const language = url.searchParams.get('language') as 'es' | 'en' | 'other' | undefined;
      const minMessages = url.searchParams.get('minMessages');
      const maxMessages = url.searchParams.get('maxMessages');
      const hasTag = url.searchParams.get('hasTag');
      const limit = url.searchParams.get('limit');

      // Check if any filters are provided
      const hasFilters = dateFrom || dateTo || language || minMessages || maxMessages || hasTag;

      if (hasFilters) {
        const filters: ConversationFilters = {
          dateFrom,
          dateTo,
          language: language && ['es', 'en', 'other'].includes(language) ? language : undefined,
          minMessages: minMessages ? parseInt(minMessages, 10) : undefined,
          maxMessages: maxMessages ? parseInt(maxMessages, 10) : undefined,
          hasTag: hasTag ? parseInt(hasTag, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : 100,
        };

        const result = await repository.listWithFilters(filters);

        return createSuccessResponse({
          conversations: result.conversations,
          stats: result.stats,
          filters: {
            dateFrom,
            dateTo,
            language,
            minMessages: filters.minMessages,
            maxMessages: filters.maxMessages,
            hasTag: filters.hasTag,
          },
        });
      }

      // No filters - use original method
      const result = await repository.listWithStats(limit ? parseInt(limit, 10) : 100);

      return createSuccessResponse({
        conversations: result.conversations,
        stats: result.stats,
      });
    } catch (error) {
      console.error('[Admin Conversations Error]:', error);
      return createErrorResponse('Failed to fetch conversations', 500);
    }
  }
);
