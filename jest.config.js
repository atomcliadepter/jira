/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  
  // Simple project setup
  projects: [
    {
      displayName: 'tools',
      testMatch: ['<rootDir>/tests/tool-registration.test.ts']
    },
    {
      displayName: 'automation',
      testMatch: ['<rootDir>/tests/automationTools.test.ts']
    },
    {
      displayName: 'cli',
      testMatch: ['<rootDir>/tests/cli-integration.test.ts']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e-integration.test.ts']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance.test.ts']
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security-validation.test.ts']
    }
  ]
};
