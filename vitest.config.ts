import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // tsconfig maps `@/*` to `./src/*`, but Vitest does not read tsconfig
    // paths. Task 2's module under test imports `@/types/quiz`, so without
    // this the suite dies resolving it.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // `node` rather than `jsdom`: everything under test is pure logic plus a
    // hand-written storage stub. Pulling in a DOM implementation would add a
    // dependency and slow the suite down for nothing.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
