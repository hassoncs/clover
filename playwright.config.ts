import { defineConfig, devices } from "playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "html",
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:8085",
		trace: "on-first-retry",
		screenshot: "on",
	},
	projects: [
		{
			name: "party",
			testDir: "./tests/e2e/party",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "editor",
			testDir: "./tests/e2e/editor",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "skia",
			testDir: "./tests/e2e/skia",
			use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:8240" },
		},
	],
});
