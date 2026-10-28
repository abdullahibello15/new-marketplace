import { defineConfig } from 'vitest/config'

// Integration tests start their own Postgres with Testcontainers (Docker must be running). They never
// use the docker-compose database, so they can't touch dev data.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30_000,
    // The first run pulls the image, which can take minutes on a slow connection.
    hookTimeout: 600_000,
  },
})
