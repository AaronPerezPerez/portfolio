/**
 * SecurityService
 * Handles message validation, sanitization, and security checks
 */

import { MessageContent, type SanitizationResult } from '../../domain/chat';
import { Result } from '../../domain/shared/Result';

export interface SecurityCheckResult {
  isValid: boolean;
  sanitizedMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  jailbreakDetected: boolean;
  threats: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export class SecurityService {
  /**
   * Validates and sanitizes an array of chat messages
   */
  static validateMessages(
    messages: Array<{ role: string; content: string }>
  ): SecurityCheckResult {
    const threats: string[] = [];
    let jailbreakDetected = false;

    // Filter valid messages
    const validMessages = messages.filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    );

    if (validMessages.length === 0) {
      return {
        isValid: false,
        sanitizedMessages: [],
        jailbreakDetected: false,
        threats: ['no_valid_messages'],
      };
    }

    // Limit to last 10 messages for context
    const recentMessages = validMessages.slice(-10);

    // Sanitize each user message
    const sanitizedMessages = recentMessages.map(m => {
      if (m.role === 'user') {
        const result = MessageContent.create(m.content);

        if (Result.isOk(result)) {
          if (result.value.flagged) {
            jailbreakDetected = true;
            threats.push(...result.value.threats);
          }
          return { role: m.role, content: result.value.content.value };
        }

        // If sanitization fails, use empty content
        return { role: m.role, content: '' };
      }

      return m;
    });

    return {
      isValid: true,
      sanitizedMessages,
      jailbreakDetected,
      threats,
    };
  }

  /**
   * Gets the jailbreak response message
   */
  static getJailbreakResponse(isEnglish: boolean): string {
    return isEnglish
      ? 'Nice try! How can I help you?'
      : '> Jaja, buen intento. ¿En qué puedo ayudarte de verdad?';
  }

  /**
   * Extracts client IP from request headers
   */
  static extractClientIP(headers: Headers): string {
    return (
      headers.get('cf-connecting-ip') ||
      headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown'
    );
  }

  /**
   * Checks rate limit (to be used with Cloudflare rate limiter)
   */
  static async checkRateLimit(
    limiter: { limit: (opts: { key: string }) => Promise<{ success: boolean }> } | undefined,
    key: string
  ): Promise<RateLimitResult> {
    if (!limiter) {
      // No rate limiter configured, allow request
      return { allowed: true };
    }

    try {
      const { success } = await limiter.limit({ key });
      return { allowed: success };
    } catch (error) {
      // On error, allow request but log
      console.error('[RateLimit Error]:', error);
      return { allowed: true };
    }
  }

  /**
   * Logs security event
   */
  static logSecurityEvent(
    type: 'jailbreak' | 'rate_limit' | 'validation_error',
    ip: string,
    details: Record<string, unknown> = {}
  ): void {
    console.warn(`[SECURITY:${type.toUpperCase()}]`, {
      ip,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}
