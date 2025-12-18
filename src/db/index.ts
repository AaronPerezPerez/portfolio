import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Re-export schema
export * from './schema';

// Re-export commonly used Drizzle operators
export { eq, and, or, isNull, isNotNull, desc, asc, sql } from 'drizzle-orm';
export { count, max, min, sum, avg } from 'drizzle-orm';
