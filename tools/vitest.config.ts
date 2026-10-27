import { coverageConfigDefaults, defineConfig } from 'vitest/config';

// The CI scripts under tools/scripts (the version guard, the lcov rebase and
// their shared CLI helper), as in mintplayer-ng-bootstrap.
export default defineConfig({
  test: {
    name: 'tools',
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['default'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: '../coverage/tools',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['scripts/**/*.mjs'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts'],
    },
  },
});
