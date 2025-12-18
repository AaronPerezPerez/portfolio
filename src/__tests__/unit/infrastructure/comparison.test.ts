/**
 * Tests for temporal comparison analytics
 */

import { describe, it, expect } from 'vitest';

describe('Temporal Comparison', () => {
  describe('Period Calculation', () => {
    it('should calculate 7-day period correctly', () => {
      const days = 7;
      const now = new Date('2024-12-17');

      // Current period: Dec 10-17
      const currentEnd = now.toISOString().split('T')[0];
      const currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - days);
      const currentStart = currentStartDate.toISOString().split('T')[0];

      // Previous period: Dec 3-9
      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const previousEnd = previousEndDate.toISOString().split('T')[0];

      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - days + 1);
      const previousStart = previousStartDate.toISOString().split('T')[0];

      expect(currentEnd).toBe('2024-12-17');
      expect(currentStart).toBe('2024-12-10');
      expect(previousEnd).toBe('2024-12-09');
      expect(previousStart).toBe('2024-12-03');
    });

    it('should calculate 30-day period correctly', () => {
      const days = 30;
      const now = new Date('2024-12-17');

      const currentEnd = now.toISOString().split('T')[0];
      const currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - days);
      const currentStart = currentStartDate.toISOString().split('T')[0];

      expect(currentEnd).toBe('2024-12-17');
      expect(currentStart).toBe('2024-11-17');
    });
  });

  describe('Change Calculation', () => {
    function calculateChange(current: number, previous: number): number {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    it('should calculate positive change correctly', () => {
      expect(calculateChange(150, 100)).toBe(50);
      expect(calculateChange(200, 100)).toBe(100);
      expect(calculateChange(110, 100)).toBe(10);
    });

    it('should calculate negative change correctly', () => {
      expect(calculateChange(50, 100)).toBe(-50);
      expect(calculateChange(75, 100)).toBe(-25);
      expect(calculateChange(90, 100)).toBe(-10);
    });

    it('should handle zero previous value', () => {
      expect(calculateChange(10, 0)).toBe(100);
      expect(calculateChange(0, 0)).toBe(0);
    });

    it('should handle no change', () => {
      expect(calculateChange(100, 100)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculateChange(105, 100)).toBe(5);
      expect(calculateChange(115, 100)).toBe(15);
    });
  });

  describe('Metrics Aggregation', () => {
    it('should calculate average messages per conversation', () => {
      const messages = 100;
      const conversations = 20;
      const avg = Math.round((messages / conversations) * 10) / 10;

      expect(avg).toBe(5);
    });

    it('should handle zero conversations', () => {
      const messages = 0;
      const conversations = 0;
      const avg = conversations > 0
        ? Math.round((messages / conversations) * 10) / 10
        : 0;

      expect(avg).toBe(0);
    });

    it('should round to one decimal place', () => {
      const messages = 33;
      const conversations = 10;
      const avg = Math.round((messages / conversations) * 10) / 10;

      expect(avg).toBe(3.3);
    });
  });

  describe('UI Formatting', () => {
    function formatChange(value: number): { text: string; class: string } {
      if (value === 0) return { text: '0%', class: 'neutral' };
      const arrow = value > 0 ? '↑' : '↓';
      const absValue = Math.abs(value);
      return {
        text: `${arrow} ${absValue}%`,
        class: value > 0 ? 'positive' : 'negative'
      };
    }

    it('should format positive change', () => {
      const result = formatChange(25);
      expect(result.text).toBe('↑ 25%');
      expect(result.class).toBe('positive');
    });

    it('should format negative change', () => {
      const result = formatChange(-15);
      expect(result.text).toBe('↓ 15%');
      expect(result.class).toBe('negative');
    });

    it('should format zero change', () => {
      const result = formatChange(0);
      expect(result.text).toBe('0%');
      expect(result.class).toBe('neutral');
    });
  });

  describe('Period Validation', () => {
    it('should clamp days between 1 and 90', () => {
      const clampDays = (days: number) => Math.min(Math.max(days, 1), 90);

      expect(clampDays(7)).toBe(7);
      expect(clampDays(30)).toBe(30);
      expect(clampDays(0)).toBe(1);
      expect(clampDays(-5)).toBe(1);
      expect(clampDays(100)).toBe(90);
      expect(clampDays(365)).toBe(90);
    });
  });
});
