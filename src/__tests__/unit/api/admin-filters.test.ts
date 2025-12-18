/**
 * Tests for Admin Conversations Filters
 */

import { describe, it, expect } from 'vitest';

describe('Conversations Filters', () => {
  describe('Filter Parameter Parsing', () => {
    it('should parse date filters correctly', () => {
      const url = new URL('http://localhost/api/admin/conversations?dateFrom=2024-01-01&dateTo=2024-12-31');

      const dateFrom = url.searchParams.get('dateFrom');
      const dateTo = url.searchParams.get('dateTo');

      expect(dateFrom).toBe('2024-01-01');
      expect(dateTo).toBe('2024-12-31');
    });

    it('should parse language filter', () => {
      const url = new URL('http://localhost/api/admin/conversations?language=es');

      const language = url.searchParams.get('language');

      expect(language).toBe('es');
    });

    it('should parse message count filters', () => {
      const url = new URL('http://localhost/api/admin/conversations?minMessages=5&maxMessages=100');

      const minMessages = url.searchParams.get('minMessages');
      const maxMessages = url.searchParams.get('maxMessages');

      expect(parseInt(minMessages || '0', 10)).toBe(5);
      expect(parseInt(maxMessages || '0', 10)).toBe(100);
    });

    it('should handle missing filters gracefully', () => {
      const url = new URL('http://localhost/api/admin/conversations');

      const dateFrom = url.searchParams.get('dateFrom') || undefined;
      const language = url.searchParams.get('language') || undefined;

      expect(dateFrom).toBeUndefined();
      expect(language).toBeUndefined();
    });
  });

  describe('Language Detection Patterns', () => {
    const spanishPatterns = ['¿', '¡', 'qué', 'cómo', 'español', 'hola', 'gracias'];
    const englishPatterns = ['what', 'how', 'hello', 'thanks', 'please', 'would'];

    it('should detect Spanish content', () => {
      const content = '¿Hola, cómo estás?';
      const lowerContent = content.toLowerCase();

      const hasSpanish = spanishPatterns.some((p) =>
        lowerContent.includes(p.toLowerCase())
      );

      expect(hasSpanish).toBe(true);
    });

    it('should detect English content', () => {
      const content = 'Hello, how are you?';
      const lowerContent = content.toLowerCase();

      const hasEnglish = englishPatterns.some((p) =>
        lowerContent.includes(p.toLowerCase())
      );

      expect(hasEnglish).toBe(true);
    });

    it('should handle neutral content', () => {
      const content = '12345 test';
      const lowerContent = content.toLowerCase();

      const hasSpanish = spanishPatterns.some((p) =>
        lowerContent.includes(p.toLowerCase())
      );
      const hasEnglish = englishPatterns.some((p) =>
        lowerContent.includes(p.toLowerCase())
      );

      expect(hasSpanish).toBe(false);
      expect(hasEnglish).toBe(false);
    });
  });

  describe('Filter State Management', () => {
    it('should track active filters count', () => {
      const filters = {
        dateFrom: '2024-01-01',
        dateTo: null,
        language: 'es',
        minMessages: 5,
        maxMessages: null,
      };

      const activeFilters = Object.values(filters).filter(
        (v) => v !== null && v !== ''
      );

      expect(activeFilters.length).toBe(3);
    });

    it('should detect when no filters are active', () => {
      const filters = {
        dateFrom: null,
        dateTo: null,
        language: null,
        minMessages: null,
        maxMessages: null,
      };

      const hasFilters = Object.values(filters).some(
        (v) => v !== null && v !== ''
      );

      expect(hasFilters).toBe(false);
    });

    it('should handle empty string as no filter', () => {
      const filters = {
        dateFrom: '',
        dateTo: '',
        language: '',
        minMessages: null,
        maxMessages: null,
      };

      const hasFilters = Object.values(filters).some(
        (v) => v !== null && v !== ''
      );

      expect(hasFilters).toBe(false);
    });
  });

  describe('URL State Persistence', () => {
    it('should build URL with filters', () => {
      const baseUrl = new URL('http://localhost/admin/conversations');
      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        language: 'es',
        minMessages: 5,
        maxMessages: null,
      };

      if (filters.dateFrom) baseUrl.searchParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) baseUrl.searchParams.set('dateTo', filters.dateTo);
      if (filters.language) baseUrl.searchParams.set('language', filters.language);
      if (filters.minMessages) baseUrl.searchParams.set('minMessages', filters.minMessages.toString());
      if (filters.maxMessages) baseUrl.searchParams.set('maxMessages', filters.maxMessages.toString());

      expect(baseUrl.searchParams.get('dateFrom')).toBe('2024-01-01');
      expect(baseUrl.searchParams.get('dateTo')).toBe('2024-12-31');
      expect(baseUrl.searchParams.get('language')).toBe('es');
      expect(baseUrl.searchParams.get('minMessages')).toBe('5');
      expect(baseUrl.searchParams.get('maxMessages')).toBeNull();
    });

    it('should clear filters from URL', () => {
      const url = new URL('http://localhost/admin/conversations?dateFrom=2024-01-01&language=es');

      ['dateFrom', 'dateTo', 'language', 'minMessages', 'maxMessages'].forEach((key) => {
        url.searchParams.delete(key);
      });

      expect(url.searchParams.get('dateFrom')).toBeNull();
      expect(url.searchParams.get('language')).toBeNull();
    });
  });

  describe('Filter Chip Generation', () => {
    it('should generate chips for active filters', () => {
      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        language: 'es',
        minMessages: 5,
        maxMessages: 100,
      };

      const chips: Array<{ key: string; label: string }> = [];

      if (filters.dateFrom) {
        chips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` });
      }
      if (filters.dateTo) {
        chips.push({ key: 'dateTo', label: `To: ${filters.dateTo}` });
      }
      if (filters.language) {
        const langNames: Record<string, string> = { es: 'Spanish', en: 'English' };
        chips.push({ key: 'language', label: langNames[filters.language] || filters.language });
      }
      if (filters.minMessages) {
        chips.push({ key: 'minMessages', label: `≥${filters.minMessages} msgs` });
      }
      if (filters.maxMessages) {
        chips.push({ key: 'maxMessages', label: `≤${filters.maxMessages} msgs` });
      }

      expect(chips.length).toBe(5);
      expect(chips[0].label).toBe('From: 2024-01-01');
      expect(chips[2].label).toBe('Spanish');
      expect(chips[3].label).toBe('≥5 msgs');
    });
  });
});
