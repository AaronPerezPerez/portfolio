/**
 * Vitest Global Setup
 * Runs before all tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock console.error to keep test output clean (but capture errors)
const originalConsoleError = console.error;
vi.spyOn(console, 'error').mockImplementation((...args) => {
  // Still log errors that aren't expected in tests
  if (process.env.DEBUG) {
    originalConsoleError(...args);
  }
});

// Global test helpers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeWithinRange(floor: number, ceiling: number): T;
    }
  }
}

// Custom matcher example
// expect.extend({
//   toBeWithinRange(received: number, floor: number, ceiling: number) {
//     const pass = received >= floor && received <= ceiling;
//     return {
//       pass,
//       message: () =>
//         `expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
//     };
//   },
// });
