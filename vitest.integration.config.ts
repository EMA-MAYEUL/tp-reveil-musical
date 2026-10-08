import { defineConfig } from 'vitest/config';

// Calls the real iTunes and MusicBrainz APIs: run manually, never in the default suite.
export default defineConfig({
  test: {
    include: ['test/**/*.int.test.ts'],
    testTimeout: 15_000,
  },
});
