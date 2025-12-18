/**
 * Cloudflare Runtime Mocks
 * Mock implementations for D1, AI, and KV bindings used in testing
 */

import { vi, type Mock } from 'vitest';

// ============================================
// D1 Database Mock
// ============================================

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
  };
}

export interface MockD1PreparedStatement {
  bind: Mock<(...values: unknown[]) => MockD1PreparedStatement>;
  first: Mock<(column?: string) => Promise<unknown | null>>;
  all: Mock<() => Promise<D1Result>>;
  run: Mock<() => Promise<D1Result>>;
  raw: Mock<() => Promise<unknown[]>>;
}

export interface MockD1Database {
  prepare: Mock<(query: string) => MockD1PreparedStatement>;
  batch: Mock<(statements: unknown[]) => Promise<unknown[]>>;
  exec: Mock<(query: string) => Promise<{ results: unknown[]; success: boolean }>>;
  dump: Mock<() => Promise<ArrayBuffer>>;
}

export function createMockD1(): MockD1Database {
  const createMockStatement = (): MockD1PreparedStatement => {
    const stmt: MockD1PreparedStatement = {
      bind: vi.fn((..._values: unknown[]) => stmt),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } })),
      run: vi.fn(async () => ({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0 } })),
      raw: vi.fn(async () => []),
    };
    return stmt;
  };

  const mockStatement = createMockStatement();

  return {
    prepare: vi.fn(() => mockStatement),
    batch: vi.fn(async () => []),
    exec: vi.fn(async () => ({ results: [], success: true })),
    dump: vi.fn(async () => new ArrayBuffer(0)),
  };
}

// ============================================
// AI Binding Mock
// ============================================

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRunOptions {
  messages: AIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface AIResponse {
  response: string;
}

export interface MockAI {
  run: Mock<(model: string, options: AIRunOptions) => Promise<AIResponse>>;
}

export function createMockAI(defaultResponse = 'Mock AI response'): MockAI {
  return {
    run: vi.fn(async (_model: string, options: AIRunOptions): Promise<AIResponse> => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check for specific test patterns in messages
      const lastUserMessage = options.messages
        .filter(m => m.role === 'user')
        .pop()?.content || '';

      // Allow custom responses based on input
      if (lastUserMessage.includes('__TEST_ERROR__')) {
        throw new Error('Mock AI Error');
      }

      return { response: defaultResponse };
    }),
  };
}

// ============================================
// KV Namespace Mock
// ============================================

interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

interface KVListResult {
  keys: { name: string; expiration?: number; metadata?: unknown }[];
  list_complete: boolean;
  cursor?: string;
}

export interface MockKV {
  get: Mock<(key: string, options?: KVGetOptions) => Promise<string | null | Record<string, unknown>>>;
  put: Mock<(key: string, value: string, options?: KVPutOptions) => Promise<void>>;
  delete: Mock<(key: string) => Promise<void>>;
  list: Mock<() => Promise<KVListResult>>;
  getWithMetadata: Mock<(key: string) => Promise<{ value: string | null; metadata: unknown }>>;
}

export function createMockKV(): MockKV {
  const store = new Map<string, { value: string; metadata?: unknown }>();

  return {
    get: vi.fn(async (key: string, options?: KVGetOptions) => {
      const item = store.get(key);
      if (!item) return null;

      if (options?.type === 'json') {
        return JSON.parse(item.value);
      }
      return item.value;
    }),
    put: vi.fn(async (key: string, value: string, _options?: KVPutOptions) => {
      store.set(key, { value });
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
      list_complete: true,
    })),
    getWithMetadata: vi.fn(async (key: string) => {
      const item = store.get(key);
      return {
        value: item?.value ?? null,
        metadata: item?.metadata ?? null,
      };
    }),
  };
}

// ============================================
// Rate Limiter Mock
// ============================================

export interface MockRateLimiter {
  limit: Mock<(options: { key: string }) => Promise<{ success: boolean }>>;
}

export function createMockRateLimiter(): MockRateLimiter {
  return {
    limit: vi.fn(async () => ({ success: true })),
  };
}

// ============================================
// Complete Runtime Environment Mock
// ============================================

export interface MockCloudflareEnv {
  DB: MockD1Database;
  AI: MockAI;
  SESSION: MockKV;
  RATE_LIMITER: MockRateLimiter;
  ADMIN_PASSWORD: string;
}

export function createMockCloudflareEnv(
  overrides: Partial<MockCloudflareEnv> = {}
): MockCloudflareEnv {
  return {
    DB: createMockD1(),
    AI: createMockAI(),
    SESSION: createMockKV(),
    RATE_LIMITER: createMockRateLimiter(),
    ADMIN_PASSWORD: 'test-password',
    ...overrides,
  };
}

// ============================================
// Astro API Context Mock
// ============================================

export interface MockAPIContext {
  locals: {
    runtime: {
      env: MockCloudflareEnv;
    };
  };
  request: Request;
  params: Record<string, string>;
  cookies: {
    get: Mock<(name: string) => { value: string } | undefined>;
    set: Mock<(name: string, value: string) => void>;
    delete: Mock<(name: string) => void>;
  };
  url: URL;
}

export function createMockAPIContext(
  options: {
    url?: string;
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    env?: Partial<MockCloudflareEnv>;
    cookies?: Record<string, string>;
  } = {}
): MockAPIContext {
  const url = new URL(options.url || 'http://localhost:4321/api/test');

  const cookieStore = new Map(Object.entries(options.cookies || {}));

  return {
    locals: {
      runtime: {
        env: createMockCloudflareEnv(options.env),
      },
    },
    request: new Request(url, {
      method: options.method || 'GET',
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: options.body
        ? { 'Content-Type': 'application/json' }
        : undefined,
    }),
    params: options.params || {},
    cookies: {
      get: vi.fn((name: string) => {
        const value = cookieStore.get(name);
        return value ? { value } : undefined;
      }),
      set: vi.fn((name: string, value: string) => {
        cookieStore.set(name, value);
      }),
      delete: vi.fn((name: string) => {
        cookieStore.delete(name);
      }),
    },
    url,
  };
}
