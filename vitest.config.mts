import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    cache: false,
    clearMocks: true,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      },
    },
    watch: false,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        ...configDefaults.exclude,
        '**/__tests__/**',
        '**/interfaces/**',
        '**/*.d.ts',
      ],
      provider: 'v8',
    },
  },
});
