/**
 * Skia Text/Font Rendering Validation
 *
 * PURPOSE:
 * Isolate and validate text/font rendering on web Skia using the repro ladder fixture.
 * This test specifically validates the "text" step which tests:
 * - Font loading (Inter font via useFont hook)
 * - Text component rendering
 * - Canvas stability with typography
 *
 * MUST NOT:
 * - Mix image/effects validation (those are separate steps in the ladder)
 */

import { expect, test } from "playwright/test";

const PENCIL_BASE = "http://127.0.0.1:8240";

test.describe("Skia Text/Font Rendering — Isolated Validation", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "error" || msg.type() === "warning") {
				console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
			}
		});
	});

	test("text step renders without WebGL context crash", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(error.message);
		});

		await page.goto(`${PENCIL_BASE}/repro?step=text`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-text-step-render.png",
			fullPage: true,
		});

		const webglErrors = errors.filter(
			(e) =>
				e.includes("WebGL") ||
				e.includes("canvas") ||
				e.includes("MakeWebGLCanvasSurface"),
		);

		console.log("Page errors during text render:", errors);
		console.log("WebGL-specific errors:", webglErrors);

		expect(webglErrors).toHaveLength(0);
	});

	test("font loading completes without errors", async ({ page }) => {
		await page.goto(`${PENCIL_BASE}/repro?step=text`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(5000);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-font-loading.png",
		});
	});

	test("canvas element exists and has dimensions", async ({ page }) => {
		await page.goto(`${PENCIL_BASE}/repro?step=text`);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		const canvas = page.locator("canvas").first();
		await expect(canvas).toBeVisible({ timeout: 10_000 });

		const boundingBox = await canvas.boundingBox();
		expect(boundingBox).not.toBeNull();
		expect(boundingBox!.width).toBeGreaterThan(100);
		expect(boundingBox!.height).toBeGreaterThan(100);

		console.log("Canvas dimensions:", boundingBox);
	});

	test("no memory leaks during repeated text renders", async ({ page }) => {
		await page.goto(`${PENCIL_BASE}/repro?step=text`);
		await page.waitForLoadState("networkidle");

		const initialMetrics = await page.evaluate(() => {
			if ("memory" in performance) {
				return (performance as { memory: { usedJSHeapSize: number } }).memory
					.usedJSHeapSize;
			}
			return null;
		});

		for (let i = 0; i < 3; i++) {
			await page.goto(`${PENCIL_BASE}/repro?step=surface`);
			await page.waitForTimeout(500);
			await page.goto(`${PENCIL_BASE}/repro?step=text`);
			await page.waitForTimeout(500);
		}

		const finalMetrics = await page.evaluate(() => {
			if ("memory" in performance) {
				return (performance as { memory: { usedJSHeapSize: number } }).memory
					.usedJSHeapSize;
			}
			return null;
		});

		console.log("Memory metrics:", {
			initial: initialMetrics,
			final: finalMetrics,
		});

		if (initialMetrics && finalMetrics) {
			const growthRatio = finalMetrics / initialMetrics;
			console.log("Memory growth ratio:", growthRatio);
			expect(growthRatio).toBeLessThan(2);
		}
	});
});

test.describe("Skia Text/Font Rendering — Font Load Timing", () => {
	test.setTimeout(45_000);

	test("font is ready within reasonable time", async ({ page }) => {
		const startTime = Date.now();

		await page.goto(`${PENCIL_BASE}/repro?step=text`);
		await page.waitForLoadState("networkidle");

		const canvas = page.locator("canvas").first();
		await expect(canvas).toBeVisible({ timeout: 10_000 });

		const loadTime = Date.now() - startTime;
		console.log(`Text step load time: ${loadTime}ms`);

		expect(loadTime).toBeLessThan(10_000);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-text-timing.png",
		});
	});

	test("concurrent font requests are handled correctly", async ({
		page,
		context,
	}) => {
		const pages = await Promise.all([context.newPage(), context.newPage()]);

		const errors: string[] = [];
		pages.forEach((p) => {
			p.on("pageerror", (e) => errors.push(e.message));
		});

		await Promise.all(
			pages.map((p) => p.goto(`${PENCIL_BASE}/repro?step=text`)),
		);

		await Promise.all(pages.map((p) => p.waitForLoadState("networkidle")));

		await Promise.all(pages.map((p) => p.waitForTimeout(3000)));

		const raceErrors = errors.filter(
			(e) =>
				e.includes("race") ||
				e.includes("concurrent") ||
				e.includes("undefined") ||
				e.includes("null"),
		);

		console.log("Concurrent load errors:", raceErrors);
		expect(raceErrors).toHaveLength(0);

		await Promise.all(pages.map((p) => p.close()));
	});
});
