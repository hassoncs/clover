import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/bridge/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
