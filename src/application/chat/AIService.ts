/**
 * AIService
 * Handles AI model calls and response processing
 */

import { SystemPromptBuilder } from './SystemPromptBuilder';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallResult {
  success: boolean;
  response: string;
  tokensUsed?: number; // Total tokens used (prompt + completion)
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AIBinding = {
  run: (model: any, options: any) => Promise<any>;
};

// AI model configuration
const AI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const MAX_TOKENS = 512;
const DEFAULT_TEMPERATURE = 0.5;

export interface AICallOptions {
  temperature?: number;
}

export class AIService {
  // Configurable temperature (can be set from outside)
  private static configuredTemperature: number | null = null;

  /**
   * Sets the temperature for AI calls
   */
  static setTemperature(temp: number | null): void {
    this.configuredTemperature = temp;
  }

  /**
   * Gets the current temperature setting
   */
  static getTemperature(): number {
    return this.configuredTemperature ?? DEFAULT_TEMPERATURE;
  }

  /**
   * Calls the AI model with the given messages
   */
  static async call(
    ai: AIBinding,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: AICallOptions
  ): Promise<AICallResult> {
    const systemPrompt = SystemPromptBuilder.build();
    const temperature = options?.temperature ?? this.configuredTemperature ?? DEFAULT_TEMPERATURE;

    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    try {
      const result = await ai.run(AI_MODEL, {
        messages: aiMessages,
        max_tokens: MAX_TOKENS,
        temperature,
      });

      // Extract response from Qwen3 format
      const message = result?.choices?.[0]?.message;
      let response = message?.content || message?.reasoning_content || '';

      // Extract token usage (Cloudflare AI format)
      const usage = result?.usage;
      const tokensUsed = usage
        ? (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
        : undefined;

      if (!response) {
        return {
          success: false,
          response: '',
          tokensUsed,
          error: 'Empty response from AI',
        };
      }

      // Post-process the response
      response = this.postProcess(response);

      return {
        success: true,
        response,
        tokensUsed,
      };
    } catch (error) {
      console.error('[AI Error]:', error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'AI call failed',
      };
    }
  }

  /**
   * Post-processes the AI response
   */
  private static postProcess(response: string): string {
    let processed = response.trim().replace(/^[\n\r]+/, '');

    // Emoji control - limit to maximum 1 emoji
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = processed.match(emojiRegex) || [];

    if (emojis.length > 1) {
      const lastEmoji = emojis[emojis.length - 1];
      processed = processed.replace(emojiRegex, '').replace(/\s+/g, ' ').trim() + ' ' + lastEmoji;
    }

    // Randomly remove emoji ~50% of the time for variety
    if (Math.random() < 0.5) {
      processed = processed.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
    }

    return processed;
  }

  /**
   * Gets a fallback response when AI fails
   */
  static getFallbackResponse(isEnglish: boolean): string {
    return isEnglish
      ? "Hi! I'm Aaron, a Software Craftsman. How can I help you?"
      : 'Hola! Soy Aaron, Software Craftsman. En qué puedo ayudarte?';
  }

  /**
   * Detects if the message appears to be in English
   */
  static detectEnglish(message: string): boolean {
    return /\b(what|how|your|the|is|are|do|can|hi|hello|hey|nice|good|great)\b/i.test(message);
  }
}
