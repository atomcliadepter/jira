
/**
 * Test setup file for Jest
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.MCP_LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock console methods to reduce test output noise
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Only show errors that are not from our logger
  if (!args[0]?.includes?.('"level":"ERROR"')) {
    originalConsoleError(...args);
  }
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after tests
afterAll(() => {
  // Restore console
  console.error = originalConsoleError;
});
