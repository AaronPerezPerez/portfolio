/**
 * SpamDetector Service
 * Detects spam and abuse patterns in conversations
 */

export interface SpamCheckResult {
  isSpam: boolean;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  details: Record<string, unknown>;
}

// Suspicious keywords that may indicate spam or abuse
const SUSPICIOUS_KEYWORDS = [
  // Spam indicators
  'buy now', 'click here', 'free money', 'act now', 'limited time',
  'winner', 'congratulations', 'selected', 'claim your',
  // Abuse indicators
  'hack', 'crack', 'bypass', 'exploit', 'injection',
  // Promotional spam
  'discount', 'offer', 'deal', 'promo code', 'sale',
  // Contact harvesting
  'send me your', 'give me your', 'what is your email', 'phone number',
];

// Patterns that indicate repeated/automated messages
const REPETITION_THRESHOLD = 3; // Same message repeated X times
const HIGH_FREQUENCY_THRESHOLD = 10; // Messages per minute
const MESSAGE_LENGTH_SPAM_THRESHOLD = 5; // Very short repeated messages

export class SpamDetector {
  /**
   * Analyze a single message for spam indicators
   */
  static analyzeMessage(content: string): SpamCheckResult {
    const lowerContent = content.toLowerCase();
    const details: Record<string, unknown> = {};

    // Check for suspicious keywords
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter((kw) =>
      lowerContent.includes(kw.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      details.keywords = foundKeywords;

      return {
        isSpam: true,
        severity: foundKeywords.length >= 3 ? 'high' : 'medium',
        reason: 'suspicious_keywords',
        details,
      };
    }

    // Check for excessive URLs
    const urlCount = (content.match(/https?:\/\//g) || []).length;
    if (urlCount >= 3) {
      details.urlCount = urlCount;

      return {
        isSpam: true,
        severity: 'medium',
        reason: 'excessive_urls',
        details,
      };
    }

    // Check for excessive caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (content.length > 20 && capsRatio > 0.7) {
      details.capsRatio = capsRatio;

      return {
        isSpam: true,
        severity: 'low',
        reason: 'excessive_caps',
        details,
      };
    }

    return {
      isSpam: false,
      severity: 'low',
      reason: '',
      details: {},
    };
  }

  /**
   * Analyze a conversation for spam patterns
   */
  static analyzeConversation(
    messages: Array<{ role: string; content: string; createdAt?: string }>
  ): SpamCheckResult {
    const userMessages = messages.filter((m) => m.role === 'user');

    if (userMessages.length === 0) {
      return { isSpam: false, severity: 'low', reason: '', details: {} };
    }

    const details: Record<string, unknown> = {};

    // Check for repeated messages
    const messageCounts = new Map<string, number>();
    for (const msg of userMessages) {
      const normalized = msg.content.toLowerCase().trim();
      messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1);
    }

    const maxRepetition = Math.max(...messageCounts.values());
    if (maxRepetition >= REPETITION_THRESHOLD) {
      details.repetitionCount = maxRepetition;

      return {
        isSpam: true,
        severity: maxRepetition >= 5 ? 'high' : 'medium',
        reason: 'repeated_messages',
        details,
      };
    }

    // Check for very short repeated messages (likely bot)
    const shortMessages = userMessages.filter((m) => m.content.length < MESSAGE_LENGTH_SPAM_THRESHOLD);
    if (shortMessages.length > 5 && shortMessages.length > userMessages.length * 0.5) {
      details.shortMessageCount = shortMessages.length;

      return {
        isSpam: true,
        severity: 'medium',
        reason: 'short_repeated_messages',
        details,
      };
    }

    // Check individual messages
    for (const msg of userMessages) {
      const result = this.analyzeMessage(msg.content);
      if (result.isSpam) {
        return result;
      }
    }

    // Check message frequency (if timestamps available)
    if (userMessages.length >= 2 && userMessages[0].createdAt) {
      const times = userMessages
        .filter((m) => m.createdAt)
        .map((m) => new Date(m.createdAt!).getTime())
        .sort((a, b) => a - b);

      if (times.length >= 2) {
        const duration = (times[times.length - 1] - times[0]) / 60000; // minutes
        const rate = userMessages.length / Math.max(duration, 1);

        if (rate > HIGH_FREQUENCY_THRESHOLD) {
          details.messageRate = rate;
          details.durationMinutes = duration;

          return {
            isSpam: true,
            severity: 'high',
            reason: 'high_frequency',
            details,
          };
        }
      }
    }

    return { isSpam: false, severity: 'low', reason: '', details: {} };
  }

  /**
   * Get a human-readable description of the spam reason
   */
  static getReasonDescription(reason: string): string {
    const descriptions: Record<string, string> = {
      suspicious_keywords: 'Contains suspicious keywords',
      excessive_urls: 'Contains too many URLs',
      excessive_caps: 'Excessive capitalization (shouting)',
      repeated_messages: 'Same message repeated multiple times',
      short_repeated_messages: 'Many very short messages (bot-like)',
      high_frequency: 'Messages sent too quickly (automated)',
    };

    return descriptions[reason] || 'Unknown spam pattern';
  }
}
