/**
 * Smoke Test
 * Verifies the testing setup is working correctly
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createMockD1,
  createMockAI,
  createMockKV,
  createMockAPIContext,
  createMockCloudflareEnv,
} from '../mocks';

describe('Vitest Setup', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should support async tests', async () => {
    const promise = Promise.resolve(42);
    await expect(promise).resolves.toBe(42);
  });

  it('should support mocking', () => {
    const mockFn = vi.fn().mockReturnValue('mocked');
    expect(mockFn()).toBe('mocked');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('Cloudflare Mocks', () => {
  describe('D1 Database Mock', () => {
    it('should create a mock D1 database', () => {
      const db = createMockD1();
      expect(db.prepare).toBeDefined();
      expect(db.batch).toBeDefined();
      expect(db.exec).toBeDefined();
    });

    it('should return mock results from queries', async () => {
      const db = createMockD1();
      const stmt = db.prepare('SELECT * FROM users');

      const result = await stmt.all();
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should support method chaining', () => {
      const db = createMockD1();
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const bound = stmt.bind(1);

      expect(bound.all).toBeDefined();
      expect(bound.first).toBeDefined();
      expect(bound.run).toBeDefined();
    });
  });

  describe('AI Binding Mock', () => {
    it('should create a mock AI binding', () => {
      const ai = createMockAI();
      expect(ai.run).toBeDefined();
    });

    it('should return mock AI responses', async () => {
      const ai = createMockAI('Test response');
      const response = await ai.run('@cf/qwen/qwen3-30b-a3b', {
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.response).toBe('Test response');
    });

    it('should throw error when triggered', async () => {
      const ai = createMockAI();
      await expect(
        ai.run('@cf/qwen/qwen3-30b-a3b', {
          messages: [{ role: 'user', content: '__TEST_ERROR__' }],
        })
      ).rejects.toThrow('Mock AI Error');
    });
  });

  describe('KV Namespace Mock', () => {
    it('should create a mock KV namespace', () => {
      const kv = createMockKV();
      expect(kv.get).toBeDefined();
      expect(kv.put).toBeDefined();
      expect(kv.delete).toBeDefined();
      expect(kv.list).toBeDefined();
    });

    it('should store and retrieve values', async () => {
      const kv = createMockKV();

      await kv.put('key', 'value');
      const value = await kv.get('key');

      expect(value).toBe('value');
    });

    it('should return null for missing keys', async () => {
      const kv = createMockKV();
      const value = await kv.get('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('API Context Mock', () => {
    it('should create a mock API context', () => {
      const context = createMockAPIContext();

      expect(context.locals.runtime.env).toBeDefined();
      expect(context.request).toBeInstanceOf(Request);
      expect(context.cookies).toBeDefined();
    });

    it('should support custom URL', () => {
      const context = createMockAPIContext({
        url: 'http://localhost:4321/api/chat',
      });

      expect(context.url.pathname).toBe('/api/chat');
    });

    it('should support custom params', () => {
      const context = createMockAPIContext({
        params: { id: '123' },
      });

      expect(context.params.id).toBe('123');
    });

    it('should support cookies', () => {
      const context = createMockAPIContext({
        cookies: { session: 'abc123' },
      });

      const cookie = context.cookies.get('session');
      expect(cookie?.value).toBe('abc123');
    });

    it('should support custom environment overrides', () => {
      const customAI = createMockAI('Custom response');
      const context = createMockAPIContext({
        env: { AI: customAI },
      });

      expect(context.locals.runtime.env.AI).toBe(customAI);
    });
  });

  describe('Complete Environment Mock', () => {
    it('should create a complete mock environment', () => {
      const env = createMockCloudflareEnv();

      expect(env.DB).toBeDefined();
      expect(env.AI).toBeDefined();
      expect(env.SESSION).toBeDefined();
      expect(env.RATE_LIMITER).toBeDefined();
      expect(env.ADMIN_PASSWORD).toBe('test-password');
    });

    it('should allow partial overrides', () => {
      const env = createMockCloudflareEnv({
        ADMIN_PASSWORD: 'custom-password',
      });

      expect(env.ADMIN_PASSWORD).toBe('custom-password');
      expect(env.DB).toBeDefined(); // Still has default
    });
  });
});
