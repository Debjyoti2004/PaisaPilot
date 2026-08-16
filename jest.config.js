const nextJest = require('next/jest.js')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/lib/finance.ts',
    'src/app/api/transactions/route.ts',
    'src/app/api/transactions/clear/route.ts',
    'src/app/api/settings/route.ts',
    'src/app/api/dashboard/route.ts',
    'src/app/api/onboarding/status/route.ts',
    'src/app/api/onboarding/complete/route.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
}

module.exports = createJestConfig(config)
