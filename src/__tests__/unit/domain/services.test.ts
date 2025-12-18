/**
 * Domain Layer - Services Tests
 */

import { describe, it, expect } from 'vitest';
import { ContentAnalyzer } from '../../../domain/chat/services/ContentAnalyzer';

describe('ContentAnalyzer Service', () => {
  describe('Language Detection', () => {
    it('should detect Spanish', () => {
      expect(ContentAnalyzer.detectLanguage('Hola, ¿cómo estás?')).toBe('es');
      expect(ContentAnalyzer.detectLanguage('¿Cuál es tu stack?')).toBe('es');
      expect(ContentAnalyzer.detectLanguage('Cuéntame sobre ti')).toBe('es');
    });

    it('should detect English', () => {
      expect(ContentAnalyzer.detectLanguage('Hello, how are you?')).toBe('en');
      expect(ContentAnalyzer.detectLanguage('What is your tech stack?')).toBe('en');
      expect(ContentAnalyzer.detectLanguage('Tell me about yourself')).toBe('en');
    });

    it('should return unknown for ambiguous content', () => {
      expect(ContentAnalyzer.detectLanguage('123 456')).toBe('unknown');
      expect(ContentAnalyzer.detectLanguage('!!!')).toBe('unknown');
    });
  });

  describe('Topic Detection', () => {
    it('should detect tech stack topic', () => {
      const topics = ContentAnalyzer.detectTopics('What is your tech stack?');
      expect(topics).toContain('Tech Stack');
    });

    it('should detect experience topic', () => {
      const topics = ContentAnalyzer.detectTopics('How many years of experience do you have?');
      expect(topics).toContain('Experience');
    });

    it('should detect availability topic', () => {
      const topics = ContentAnalyzer.detectTopics('Are you available for hire?');
      expect(topics).toContain('Availability');
    });

    it('should detect pricing topic', () => {
      const topics = ContentAnalyzer.detectTopics('What is your hourly rate?');
      expect(topics).toContain('Pricing');
    });

    it('should detect contact topic', () => {
      const topics = ContentAnalyzer.detectTopics('Can I email you?');
      expect(topics).toContain('Contact');
    });

    it('should detect multiple topics', () => {
      const topics = ContentAnalyzer.detectTopics('Are you available for hire? What is your rate?');
      expect(topics).toContain('Availability');
      expect(topics).toContain('Pricing');
    });

    it('should return Other for unmatched content', () => {
      const topics = ContentAnalyzer.detectTopics('xyz abc 123');
      expect(topics).toEqual(['Other']);
    });
  });

  describe('Lead Detection', () => {
    it('should detect lead keywords', () => {
      expect(ContentAnalyzer.detectLead('what is your rate')).toBe(true);
      expect(ContentAnalyzer.detectLead('looking to hire')).toBe(true);
      expect(ContentAnalyzer.detectLead('are you available')).toBe(true);
      expect(ContentAnalyzer.detectLead('need to contact')).toBe(true);
      expect(ContentAnalyzer.detectLead('cuál es el precio')).toBe(true);
    });

    it('should not flag non-lead content', () => {
      expect(ContentAnalyzer.detectLead('hello')).toBe(false);
      expect(ContentAnalyzer.detectLead('nice portfolio')).toBe(false);
    });
  });

  describe('Lead Score Calculation', () => {
    it('should give higher score for more keywords', () => {
      const lowScore = ContentAnalyzer.calculateLeadScore('hello');
      const highScore = ContentAnalyzer.calculateLeadScore('i want to hire you, what is your rate and availability?');

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should give bonus for longer messages', () => {
      const short = ContentAnalyzer.calculateLeadScore('hire');
      const long = ContentAnalyzer.calculateLeadScore('i am looking to hire a developer for a long term project');

      expect(long).toBeGreaterThan(short);
    });

    it('should give bonus for questions', () => {
      const statement = ContentAnalyzer.calculateLeadScore('i want to hire you');
      const question = ContentAnalyzer.calculateLeadScore('can i hire you?');

      expect(question).toBeGreaterThan(statement);
    });

    it('should cap at 100', () => {
      const score = ContentAnalyzer.calculateLeadScore(
        'hire price rate budget contact email linkedin available?'
      );
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Full Analysis', () => {
    it('should return complete analysis', () => {
      const analysis = ContentAnalyzer.analyze('What is your hourly rate?');

      expect(analysis.language).toBe('en');
      expect(analysis.topics).toContain('Pricing');
      expect(analysis.isLead).toBe(true);
      expect(analysis.leadScore).toBeGreaterThan(0);
      expect(analysis.wordCount).toBe(5);
    });

    it('should analyze Spanish content', () => {
      const analysis = ContentAnalyzer.analyze('¿Cuál es tu experiencia con React?');

      expect(analysis.language).toBe('es');
      expect(analysis.topics).toContain('Experience');
      expect(analysis.topics).toContain('Tech Stack');
    });
  });

  describe('Batch Analysis', () => {
    it('should aggregate multiple messages', () => {
      const messages = [
        'Hello, how are you?',
        'Hola, ¿cómo estás?',
        'What is your rate?',
        'Tell me about your experience',
      ];

      const result = ContentAnalyzer.batchAnalyze(messages);

      expect(result.languages.en).toBe(3);
      expect(result.languages.es).toBe(1);
      expect(result.leadCount).toBe(1);
      expect(result.topics['Experience']).toBeGreaterThan(0);
      expect(result.avgLeadScore).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const result = ContentAnalyzer.batchAnalyze([]);

      expect(result.languages).toEqual({ es: 0, en: 0, unknown: 0 });
      expect(result.leadCount).toBe(0);
      expect(result.avgLeadScore).toBe(0);
    });
  });
});
