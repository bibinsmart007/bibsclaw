// Code Coverage Configuration - Phase 1.3
// Target: 80%+ code coverage

export const coverageConfig = {
  provider: 'v8' as const,
  reporter: ['text', 'json', 'html', 'lcov'],
  reportsDirectory: './coverage',
  thresholds: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  include: ['src/**/*.ts'],
  exclude: ['src/__tests__/**', 'src/**/*.d.ts', 'node_modules/**'],
};
