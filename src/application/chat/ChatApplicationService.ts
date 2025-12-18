/**
 * ChatApplicationService
 * Main orchestrator for chat functionality
 */

import { SecurityService } from './SecurityService';
import { CheatCodeService } from './CheatCodeService';
import { AIService, type AIBinding } from './AIService';

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  userId?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  statusCode: number;
  steamUnlocked?: boolean;
  tokensUsed?: number; // AI tokens used for this response
}

export interface ChatDependencies {
  ai?: AIBinding;
  rateLimiter?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
  clientIP: string;
}

export class ChatApplicationService {
  /**
   * Processes a chat request and returns a response
   */
  static async processChat(
    request: ChatRequest,
    deps: ChatDependencies
  ): Promise<ChatResponse> {
    // Step 1: Rate limiting
    const rateLimitResult = await SecurityService.checkRateLimit(
      deps.rateLimiter,
      deps.clientIP
    );

    if (!rateLimitResult.allowed) {
      SecurityService.logSecurityEvent('rate_limit', deps.clientIP);
      return {
        success: false,
        error: 'Demasiadas solicitudes. Intenta en un minuto.',
        statusCode: 429,
      };
    }

    // Step 2: Validate and sanitize messages
    const securityResult = SecurityService.validateMessages(request.messages);

    if (!securityResult.isValid) {
      return {
        success: false,
        error: 'Invalid request: messages array required',
        statusCode: 400,
      };
    }

    // Step 3: Check for jailbreak attempts
    if (securityResult.jailbreakDetected) {
      SecurityService.logSecurityEvent('jailbreak', deps.clientIP, {
        threats: securityResult.threats,
      });

      const lastMessage = securityResult.sanitizedMessages
        .filter(m => m.role === 'user')
        .pop()?.content || '';
      const isEnglish = AIService.detectEnglish(lastMessage);

      return {
        success: true,
        response: SecurityService.getJailbreakResponse(isEnglish),
        statusCode: 200,
      };
    }

    // Step 4: Check for cheat codes (Easter eggs)
    const lastUserMessage = securityResult.sanitizedMessages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const cheatResult = CheatCodeService.detect(lastUserMessage);
    if (cheatResult.isCheat) {
      return {
        success: true,
        response: cheatResult.response,
        statusCode: 200,
        ...CheatCodeService.getCheatResponseData(),
      };
    }

    // Step 5: Check AI availability
    if (!deps.ai) {
      return {
        success: false,
        error: 'AI service not available',
        statusCode: 503,
      };
    }

    // Step 6: Call AI
    const aiResult = await AIService.call(
      deps.ai,
      securityResult.sanitizedMessages as Array<{ role: 'user' | 'assistant'; content: string }>
    );

    // Step 7: Handle response or fallback
    if (!aiResult.success || !aiResult.response) {
      console.warn('[AI Fallback]: Using default response', aiResult.error);
      const isEnglish = AIService.detectEnglish(lastUserMessage);
      return {
        success: true,
        response: AIService.getFallbackResponse(isEnglish),
        statusCode: 200,
      };
    }

    return {
      success: true,
      response: aiResult.response,
      statusCode: 200,
      tokensUsed: aiResult.tokensUsed,
    };
  }

  /**
   * Extracts the last user message content for persistence
   */
  static getLastUserMessage(
    messages: Array<{ role: string; content: string }>
  ): string | undefined {
    return messages
      .filter(m => m.role === 'user')
      .pop()?.content;
  }
}
