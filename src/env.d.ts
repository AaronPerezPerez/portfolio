/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Environment Bindings
 * These are the bindings available in the Cloudflare Workers runtime
 */
interface CloudflareEnv {
  // D1 Database
  DB: D1Database;

  // Workers AI
  AI: Ai;

  // KV Namespace for sessions
  SESSION: KVNamespace;

  // Rate Limiter binding
  CHAT_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };

  // Environment variables
  ADMIN_PASSWORD: string;
  ADMIN_SECRET: string;
}

/**
 * Cloudflare Runtime
 * Provided by the @astrojs/cloudflare adapter
 */
interface CloudflareRuntime {
  env: CloudflareEnv;
  cf: IncomingRequestCfProperties;
  ctx: ExecutionContext;
}

/**
 * Extend Astro's App.Locals interface
 */
declare namespace App {
  interface Locals {
    runtime: CloudflareRuntime;
  }
}
