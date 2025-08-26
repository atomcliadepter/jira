
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000,
  maxWorkers: 1,
  // Test runner configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/*.unit.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      }
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/*.integration.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    },
    {
      displayName: 'existing',
      testMatch: ['<rootDir>/tests/workflow.test.ts', '<rootDir>/tests/integration.test.ts', '<rootDir>/tests/qcli-compatibility.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    }
  ]
};
