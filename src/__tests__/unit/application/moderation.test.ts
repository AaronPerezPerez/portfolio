/**
 * Moderation Module - SpamDetector Tests
 */

import { describe, it, expect } from 'vitest';
import { SpamDetector } from '../../../application/moderation';

describe('SpamDetector Service', () => {
  describe('analyzeMessage', () => {
    describe('Suspicious Keywords Detection', () => {
      it('should detect spam keywords', () => {
        const result = SpamDetector.analyzeMessage('Buy now! Click here for free money!');

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('suspicious_keywords');
        expect(result.details.keywords).toContain('buy now');
        expect(result.details.keywords).toContain('click here');
        expect(result.details.keywords).toContain('free money');
      });

      it('should flag abuse-related keywords', () => {
        const result = SpamDetector.analyzeMessage('How to hack this system and bypass security?');

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('suspicious_keywords');
        expect(result.details.keywords).toContain('hack');
        expect(result.details.keywords).toContain('bypass');
      });

      it('should detect contact harvesting attempts', () => {
        const result = SpamDetector.analyzeMessage('Send me your phone number please');

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('suspicious_keywords');
        expect(result.details.keywords).toContain('send me your');
        expect(result.details.keywords).toContain('phone number');
      });

      it('should set high severity for multiple keywords', () => {
        const result = SpamDetector.analyzeMessage('Buy now! Limited time offer! Click here to claim your prize!');

        expect(result.isSpam).toBe(true);
        expect(result.severity).toBe('high');
      });

      it('should set medium severity for fewer keywords', () => {
        const result = SpamDetector.analyzeMessage('Click here for details');

        expect(result.isSpam).toBe(true);
        expect(result.severity).toBe('medium');
      });
    });

    describe('Excessive URLs Detection', () => {
      it('should flag messages with 3+ URLs', () => {
        const result = SpamDetector.analyzeMessage(
          'Check out https://example.com and https://test.com and https://spam.com'
        );

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('excessive_urls');
        expect(result.details.urlCount).toBe(3);
        expect(result.severity).toBe('medium');
      });

      it('should not flag messages with fewer than 3 URLs', () => {
        const result = SpamDetector.analyzeMessage(
          'Check out https://example.com and https://test.com'
        );

        expect(result.isSpam).toBe(false);
      });
    });

    describe('Excessive Caps Detection', () => {
      it('should flag messages with excessive capitalization', () => {
        const result = SpamDetector.analyzeMessage('THIS IS A MESSAGE IN ALL CAPS THAT IS VERY LOUD');

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('excessive_caps');
        expect(result.severity).toBe('low');
        expect(result.details.capsRatio).toBeGreaterThan(0.7);
      });

      it('should not flag short messages with caps', () => {
        const result = SpamDetector.analyzeMessage('WOW');

        expect(result.isSpam).toBe(false);
      });

      it('should not flag normal messages', () => {
        const result = SpamDetector.analyzeMessage('This is a Normal Message With Some Caps');

        expect(result.isSpam).toBe(false);
      });
    });

    describe('Clean Messages', () => {
      it('should not flag legitimate questions', () => {
        const result = SpamDetector.analyzeMessage('What technologies do you work with?');

        expect(result.isSpam).toBe(false);
        expect(result.reason).toBe('');
      });

      it('should not flag greetings', () => {
        const result = SpamDetector.analyzeMessage('Hello! Nice to meet you.');

        expect(result.isSpam).toBe(false);
      });

      it('should not flag normal conversation', () => {
        const result = SpamDetector.analyzeMessage(
          'I am interested in learning more about your experience with React and Node.js'
        );

        expect(result.isSpam).toBe(false);
      });
    });
  });

  describe('analyzeConversation', () => {
    describe('Empty and Valid Conversations', () => {
      it('should not flag empty conversations', () => {
        const result = SpamDetector.analyzeConversation([]);

        expect(result.isSpam).toBe(false);
      });

      it('should not flag conversations with only assistant messages', () => {
        const messages = [
          { role: 'assistant', content: 'Hello! How can I help you?' },
          { role: 'assistant', content: 'I specialize in React and Node.js' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(false);
      });

      it('should not flag normal conversations', () => {
        const messages = [
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi! How can I help?' },
          { role: 'user', content: 'What is your tech stack?' },
          { role: 'assistant', content: 'I work with React, Node.js, and TypeScript.' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(false);
      });
    });

    describe('Repeated Messages Detection', () => {
      it('should flag conversations with repeated messages (3+ times)', () => {
        const messages = [
          { role: 'user', content: 'Buy now!' },
          { role: 'user', content: 'Buy now!' },
          { role: 'user', content: 'Buy now!' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('repeated_messages');
        expect(result.details.repetitionCount).toBe(3);
        expect(result.severity).toBe('medium');
      });

      it('should set high severity for 5+ repetitions', () => {
        const messages = Array(5).fill({ role: 'user', content: 'spam message' });

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.severity).toBe('high');
      });

      it('should normalize case when checking repetitions', () => {
        const messages = [
          { role: 'user', content: 'HELLO' },
          { role: 'user', content: 'hello' },
          { role: 'user', content: 'Hello' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('repeated_messages');
      });
    });

    describe('Short Repeated Messages Detection', () => {
      it('should flag many very short messages (bot-like behavior)', () => {
        const messages = [
          { role: 'user', content: 'hi' },
          { role: 'user', content: 'hey' },
          { role: 'user', content: 'yo' },
          { role: 'user', content: 'ok' },
          { role: 'user', content: 'ya' },
          { role: 'user', content: 'no' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('short_repeated_messages');
        expect(result.severity).toBe('medium');
      });

      it('should not flag short messages if less than 50% of total', () => {
        const messages = [
          { role: 'user', content: 'hi' },
          { role: 'user', content: 'What technologies do you specialize in?' },
          { role: 'user', content: 'Tell me more about your experience with React' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(false);
      });
    });

    describe('High Frequency Detection', () => {
      it('should flag conversations with very high message frequency', () => {
        const baseTime = new Date('2024-01-01T10:00:00Z');
        const messages = Array(15).fill(null).map((_, i) => ({
          role: 'user',
          content: `Message ${i + 1}`,
          createdAt: new Date(baseTime.getTime() + i * 1000).toISOString(), // 1 second apart
        }));

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('high_frequency');
        expect(result.severity).toBe('high');
      });

      it('should not flag normal frequency conversations', () => {
        const baseTime = new Date('2024-01-01T10:00:00Z');
        const messages = [
          { role: 'user', content: 'Hello', createdAt: baseTime.toISOString() },
          { role: 'user', content: 'Question', createdAt: new Date(baseTime.getTime() + 60000).toISOString() },
          { role: 'user', content: 'Thanks', createdAt: new Date(baseTime.getTime() + 120000).toISOString() },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(false);
      });
    });

    describe('Content-Based Detection in Conversations', () => {
      it('should flag conversations containing spam messages', () => {
        const messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
          { role: 'user', content: 'Buy now! Click here for free money!' },
        ];

        const result = SpamDetector.analyzeConversation(messages);

        expect(result.isSpam).toBe(true);
        expect(result.reason).toBe('suspicious_keywords');
      });
    });
  });

  describe('getReasonDescription', () => {
    it('should return correct description for suspicious_keywords', () => {
      const description = SpamDetector.getReasonDescription('suspicious_keywords');
      expect(description).toBe('Contains suspicious keywords');
    });

    it('should return correct description for excessive_urls', () => {
      const description = SpamDetector.getReasonDescription('excessive_urls');
      expect(description).toBe('Contains too many URLs');
    });

    it('should return correct description for excessive_caps', () => {
      const description = SpamDetector.getReasonDescription('excessive_caps');
      expect(description).toBe('Excessive capitalization (shouting)');
    });

    it('should return correct description for repeated_messages', () => {
      const description = SpamDetector.getReasonDescription('repeated_messages');
      expect(description).toBe('Same message repeated multiple times');
    });

    it('should return correct description for short_repeated_messages', () => {
      const description = SpamDetector.getReasonDescription('short_repeated_messages');
      expect(description).toBe('Many very short messages (bot-like)');
    });

    it('should return correct description for high_frequency', () => {
      const description = SpamDetector.getReasonDescription('high_frequency');
      expect(description).toBe('Messages sent too quickly (automated)');
    });

    it('should return fallback for unknown reasons', () => {
      const description = SpamDetector.getReasonDescription('unknown_reason');
      expect(description).toBe('Unknown spam pattern');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const result = SpamDetector.analyzeMessage('');
      expect(result.isSpam).toBe(false);
    });

    it('should handle whitespace-only messages', () => {
      const result = SpamDetector.analyzeMessage('   \n\t  ');
      expect(result.isSpam).toBe(false);
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a legitimate message. '.repeat(100);
      const result = SpamDetector.analyzeMessage(longMessage);
      expect(result.isSpam).toBe(false);
    });

    it('should handle messages with special characters', () => {
      const result = SpamDetector.analyzeMessage('Hello! @#$%^&*() 你好 مرحبا');
      expect(result.isSpam).toBe(false);
    });

    it('should handle mixed language content', () => {
      const result = SpamDetector.analyzeMessage('Hola! What is your stack? ¿Cuál es tu experiencia?');
      expect(result.isSpam).toBe(false);
    });
  });
});
