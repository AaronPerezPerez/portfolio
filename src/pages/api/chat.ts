/**
 * Chat API Endpoint
 * Thin controller that delegates to ChatApplicationService
 */

import type { APIContext } from 'astro';
import {
  ChatApplicationService,
  SecurityService,
  type ChatRequest,
} from '../../application/chat';
import { D1MessageRepository } from '../../infrastructure/persistence';
import { createDb } from '../../db';

export const prerender = false;

export async function POST({ request, locals }: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  try {
    // Extract dependencies from Cloudflare context
    const ai = locals.runtime?.env?.AI;
    const rateLimiter = locals.runtime?.env?.CHAT_LIMITER;
    const clientIP = SecurityService.extractClientIP(request.headers);

    // Parse request body
    const body = (await request.json()) as ChatRequest;

    // Process chat through application service
    const result = await ChatApplicationService.processChat(body, {
      ai,
      rateLimiter,
      clientIP,
    });

    // Handle persistence in background (Cloudflare-specific)
    const d1 = locals.runtime?.env?.DB;
    const ctx = locals.runtime?.ctx;

    if (d1 && body.userId && ctx?.waitUntil && result.success && result.response) {
      const userId = body.userId;
      const lastUserMessage = ChatApplicationService.getLastUserMessage(body.messages);

      ctx.waitUntil(
        persistMessages(d1, userId, lastUserMessage, result.response, result.tokensUsed)
      );
    }

    // Build response
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.statusCode, headers }
      );
    }

    return new Response(
      JSON.stringify({
        response: result.response,
        ...(result.steamUnlocked && { steamUnlocked: true }),
      }),
      { status: result.statusCode, headers }
    );
  } catch (error) {
    console.error('[Chat API Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

/**
 * Persists messages in background (non-blocking)
 */
async function persistMessages(
  d1: D1Database,
  userId: string,
  userMessage: string | undefined,
  assistantResponse: string,
  tokensUsed?: number
): Promise<void> {
  try {
    const db = createDb(d1);
    const messageRepo = new D1MessageRepository(d1);

    // Get or create conversation
    const { getOrCreateConversation } = await import('../../lib/db');
    const conversationId = await getOrCreateConversation(db, userId);

    // Save messages with token usage on assistant message
    const messagesToSave: Array<{ role: 'user' | 'assistant'; content: string; tokensUsed?: number }> = [];

    if (userMessage) {
      messagesToSave.push({ role: 'user', content: userMessage });
    }
    messagesToSave.push({ role: 'assistant', content: assistantResponse, tokensUsed });

    await messageRepo.saveBatch(conversationId, messagesToSave);
  } catch (error) {
    console.error('[Persistence Error]:', error);
  }
}
