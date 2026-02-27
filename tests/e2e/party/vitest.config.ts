import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/e2e/party/**/*.test.ts"],
		testTimeout: 120_000,
		hookTimeout: 30_000,
		pool: "forks",
		poolOptions: {
			forks: { singleFork: true },
		},
	},
});
