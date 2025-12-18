/**
 * MessageContent Value Object
 * Immutable message content with sanitization and validation
 */

import { Result } from '../../shared/Result';

const MAX_CONTENT_LENGTH = 1000;

// Dangerous patterns for jailbreak detection
const DANGEROUS_PATTERNS = [
  // Override de instrucciones
  /(?:ignore|forget|olvida|bypass|ignora)[\s\S]{0,50}(?:instruction|prompt|anterior|previous)/i,
  // Revelación de prompt
  /(?:system\s*prompt|instrucciones\s*del\s*sistema|show\s*your\s*prompt|muestra.*prompt|dame.*prompt)/i,
  // Cambio de rol
  /(?:now\s+you\s+are|ahora\s+eres|actúa\s+como|pretend\s+to\s+be|eres\s+un)/i,
  // Modo especial
  /(?:developer\s*mode|modo\s*desarrollador|admin\s*mode|modo\s*admin|jailbreak)/i,
  // Autoridad falsa
  /(?:i'm\s+the\s+admin|soy\s+el\s+admin|i\s+created\s+you|yo\s+te\s+creé|openai|anthropic)/i,
  // DAN y variantes conocidas
  /(?:DAN|do\s+anything\s+now|sin\s+restricciones|without\s+restrictions)/i,
];

export interface SanitizationResult {
  content: MessageContent;
  flagged: boolean;
  threats: string[];
}

export class MessageContent {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  get length(): number {
    return this._value.length;
  }

  /**
   * Creates and sanitizes message content
   */
  static create(value: string): Result<SanitizationResult, string> {
    if (!value || typeof value !== 'string') {
      return Result.fail('Message content cannot be empty');
    }

    let clean = value.trim();
    const threats: string[] = [];
    let flagged = false;

    // Detect dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(clean)) {
        threats.push(pattern.source.slice(0, 30));
        flagged = true;
      }
    }

    // Limit length (prevents context exhaustion)
    if (clean.length > MAX_CONTENT_LENGTH) {
      clean = clean.substring(0, MAX_CONTENT_LENGTH);
      flagged = true;
      threats.push('length_exceeded');
    }

    // Remove control characters (except newlines and tabs)
    clean = clean.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    return Result.ok({
      content: new MessageContent(clean),
      flagged,
      threats,
    });
  }

  /**
   * Creates content without sanitization (use for trusted sources like DB)
   */
  static fromTrusted(value: string): MessageContent {
    return new MessageContent(value);
  }

  /**
   * Detects the language of the content
   */
  detectLanguage(): 'es' | 'en' | 'unknown' {
    const lowerText = this._value.toLowerCase();

    // Spanish indicators
    const spanishPatterns = [
      /\b(hola|qué|cómo|cuál|está|están|para|por|con|una|uno|que|eres|puedes|cuéntame|buenas|dónde|cuánto|cuántos|tengo|tienes)\b/gi,
      /[áéíóúñ¿¡]/g,
    ];

    // English indicators
    const englishPatterns = [
      /\b(the|what|how|your|with|for|you|are|this|have|can|do|does|tell|about|hello|hi|hey|nice|great|cool|where|when|why)\b/gi,
    ];

    let esScore = 0;
    let enScore = 0;

    for (const pattern of spanishPatterns) {
      const matches = lowerText.match(pattern);
      esScore += matches ? matches.length : 0;
    }

    for (const pattern of englishPatterns) {
      const matches = lowerText.match(pattern);
      enScore += matches ? matches.length : 0;
    }

    if (esScore > enScore) return 'es';
    if (enScore > esScore) return 'en';
    return 'unknown';
  }

  /**
   * Checks if content appears to be in English
   */
  isEnglish(): boolean {
    return /\b(what|how|your|the|is|are|do|can|hi|hello|hey|nice|good|great)\b/i.test(this._value);
  }

  equals(other: MessageContent): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
