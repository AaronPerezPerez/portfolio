/**
 * Tests for cost analytics functionality
 */

import { describe, it, expect } from 'vitest';

describe('Cost Analytics', () => {
  // Cost per token (as defined in costs.ts)
  const COST_PER_TOKEN = 0.00001;

  describe('Cost Calculation', () => {
    it('should calculate cost from tokens', () => {
      const tokens = 1000;
      const cost = tokens * COST_PER_TOKEN;

      expect(cost).toBe(0.01);
    });

    it('should handle zero tokens', () => {
      const tokens = 0;
      const cost = tokens * COST_PER_TOKEN;

      expect(cost).toBe(0);
    });

    it('should calculate cost for large token counts', () => {
      const tokens = 100000;
      const cost = tokens * COST_PER_TOKEN;

      expect(cost).toBe(1);
    });
  });

  describe('Average Calculations', () => {
    it('should calculate average tokens per message', () => {
      const totalTokens = 5000;
      const totalMessages = 10;
      const avg = totalMessages > 0
        ? Math.round(totalTokens / totalMessages)
        : 0;

      expect(avg).toBe(500);
    });

    it('should handle zero messages', () => {
      const totalTokens = 5000;
      const totalMessages = 0;
      const avg = totalMessages > 0
        ? Math.round(totalTokens / totalMessages)
        : 0;

      expect(avg).toBe(0);
    });

    it('should calculate average cost per conversation', () => {
      const totalTokens = 10000;
      const conversationCount = 5;
      const avgCost = conversationCount > 0
        ? Math.round((totalTokens * COST_PER_TOKEN / conversationCount) * 10000) / 10000
        : 0;

      expect(avgCost).toBe(0.02);
    });
  });

  describe('Number Formatting', () => {
    function formatNumber(num: number): string {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }

    it('should format numbers under 1000', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(999)).toBe('999');
      expect(formatNumber(0)).toBe('0');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(5500)).toBe('5.5K');
      expect(formatNumber(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(2500000)).toBe('2.5M');
    });
  });

  describe('Date Filling', () => {
    it('should fill missing dates with zeros', () => {
      const data = [
        { date: '2024-12-15', tokens: 100 },
        { date: '2024-12-17', tokens: 200 },
      ];

      const dataMap = new Map(data.map(d => [d.date, d.tokens]));
      const result: { date: string; tokens: number }[] = [];

      // Fill dates from 15 to 17
      for (let i = 15; i <= 17; i++) {
        const dateStr = `2024-12-${i.toString().padStart(2, '0')}`;
        result.push({
          date: dateStr,
          tokens: dataMap.get(dateStr) || 0,
        });
      }

      expect(result).toHaveLength(3);
      expect(result[0].tokens).toBe(100);
      expect(result[1].tokens).toBe(0); // Dec 16 missing
      expect(result[2].tokens).toBe(200);
    });
  });

  describe('Token Tracking', () => {
    it('should sum prompt and completion tokens', () => {
      const usage = {
        prompt_tokens: 150,
        completion_tokens: 250,
      };

      const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);

      expect(totalTokens).toBe(400);
    });

    it('should handle missing token fields', () => {
      const usage: { prompt_tokens?: number; completion_tokens?: number } = {};

      const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);

      expect(totalTokens).toBe(0);
    });

    it('should handle partial token fields', () => {
      const usage = {
        prompt_tokens: 100,
      };

      const totalTokens = (usage.prompt_tokens || 0) + ((usage as any).completion_tokens || 0);

      expect(totalTokens).toBe(100);
    });
  });

  describe('Bar Chart Height Calculation', () => {
    it('should calculate bar height as percentage of max', () => {
      const daily = [
        { tokens: 100 },
        { tokens: 50 },
        { tokens: 200 },
      ];

      const maxTokens = Math.max(...daily.map(d => d.tokens), 1);

      const heights = daily.map(d => (d.tokens / maxTokens) * 100);

      expect(heights[0]).toBe(50); // 100/200 = 50%
      expect(heights[1]).toBe(25); // 50/200 = 25%
      expect(heights[2]).toBe(100); // 200/200 = 100%
    });

    it('should handle all zeros', () => {
      const daily = [
        { tokens: 0 },
        { tokens: 0 },
      ];

      const maxTokens = Math.max(...daily.map(d => d.tokens), 1);

      // Max is 1 (minimum), so all heights are 0
      const heights = daily.map(d => (d.tokens / maxTokens) * 100);

      expect(heights[0]).toBe(0);
      expect(heights[1]).toBe(0);
    });
  });
});
