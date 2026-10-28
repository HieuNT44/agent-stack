import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // What ships in dist/. bin.ts is the process boundary — argv in, exit
      // code out — and everything it calls is measured through cli.ts.
      include: ['src/**/*.ts'],
      exclude: ['src/bin.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
