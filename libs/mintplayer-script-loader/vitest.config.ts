import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [nxViteTsPaths()],
  test: {
    name: 'mintplayer-script-loader',
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file that no test imports is absent from the report rather than 0%.
      include: ['**/*.ts'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/mintplayer-script-loader',
    },
  },
});
