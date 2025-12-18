/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

// Astro's getViteConfig accepts Vitest test config but types don't reflect this
export default getViteConfig({
  test: {
    // Use happy-dom for DOM testing (lighter than jsdom)
    environment: 'happy-dom',

    // Include patterns for test files
    include: ['src/**/*.{test,spec}.{js,ts}'],

    // Global test setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },

    // Setup files for mocks
    setupFiles: ['./src/__tests__/setup.ts'],

    // Timeout for async tests
    testTimeout: 10000,
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
