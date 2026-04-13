import type {Config} from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.ts and .env files
    dir: './',
});

// Integration tests (staging, graph orchestration, route handlers) require a running
// PostgreSQL test database.  They are excluded by default and only enabled when
// RUN_INTEGRATION=true (set by bin/run-api-tests.sh).
const integrationPatterns = [
  '<rootDir>/src/lib/staging/',
  '<rootDir>/src/lib/graph/',
  '<rootDir>/src/app/api/',
];

const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: [
      '/node_modules/',
      '/.next/',
      ...(process.env.RUN_INTEGRATION !== 'true' ? integrationPatterns : []),
    ],
};

export default createJestConfig(config);
