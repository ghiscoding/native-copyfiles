import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    cache: false,
    clearMocks: true,
    environment: 'node',
    watch: false,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        ...configDefaults.exclude,
        '**/__tests__/**',
        '**/interfaces.ts',
        '**/*.d.ts',
      ],
      provider: 'v8',
    },
  },
});
