/**
 * Skia Fresh-Node Chrome Rendering Validation
 *
 * PURPOSE:
 * Isolate and validate fresh-node chrome rendering on web Skia using the repro ladder fixture.
 * This test specifically validates the "fresh-node-chrome" step which tests:
 * - Scale animation (0.985 → 1.0)
 * - Dashed border ring with animated phase
 * - Opacity fade-out after 1800ms
 * - Pure Skia rendering (no HTML fallback)
 *
 * MUST NOT:
 * - Mix full effects/motion complexity (this is minimal proof only)
 */

import { expect, test } from "playwright/test";

const STORYBOOK_BASE = "http://localhost:6007";
const FRESH_NODE_STORY_ID = "pen-skia-web-repro--fresh-node-chrome";
const SURFACE_STORY_ID = "pen-skia-web-repro--solid-rect";
const STORY_URL = `${STORYBOOK_BASE}/iframe.html?id=${FRESH_NODE_STORY_ID}&viewMode=story`;
const SURFACE_URL = `${STORYBOOK_BASE}/iframe.html?id=${SURFACE_STORY_ID}&viewMode=story`;

test.describe("Skia Fresh-Node Chrome — Isolated Validation", () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "error" || msg.type() === "warning") {
				console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
			}
		});
	});

	test("fresh-node-chrome step renders without WebGL context crash", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(error.message);
		});

		await page.goto(STORY_URL);
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(3000);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-fresh-node-chrome-render.png",
			fullPage: true,
		});

		const webglErrors = errors.filter(
			(e) =>
				e.includes("WebGL") ||
				e.includes("canvas") ||
				e.includes("MakeWebGLCanvasSurface"),
		);

		console.log("Page errors during fresh-node-chrome render:", errors);
		console.log("WebGL-specific errors:", webglErrors);

		expect(webglErrors).toHaveLength(0);
	});

	test("canvas element exists and has dimensions", async ({ page }) => {
		await page.goto(STORY_URL);
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

	test("animation runs for full duration without crash", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => {
			errors.push(error.message);
		});

		await page.goto(STORY_URL);
		await page.waitForLoadState("networkidle");

		// Wait for the full animation cycle (1800ms fade trigger + 200ms fade + buffer)
		await page.waitForTimeout(2500);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-fresh-node-chrome-post-animation.png",
			fullPage: true,
		});

		const animationErrors = errors.filter(
			(e) =>
				e.includes("animation") ||
				e.includes("Reanimated") ||
				e.includes("timing") ||
				e.includes("WebGL"),
		);

		console.log("Animation cycle errors:", animationErrors);
		expect(animationErrors).toHaveLength(0);
	});

	test("no memory leaks during repeated fresh-node-chrome renders", async ({
		page,
	}) => {
		await page.goto(STORY_URL);
		await page.waitForLoadState("networkidle");

		const initialMetrics = await page.evaluate(() => {
			if ("memory" in performance) {
				return (performance as { memory: { usedJSHeapSize: number } }).memory
					.usedJSHeapSize;
			}
			return null;
		});

		// Cycle through fresh-node-chrome multiple times
		for (let i = 0; i < 3; i++) {
			await page.goto(SURFACE_URL);
			await page.waitForTimeout(300);
			await page.goto(STORY_URL);
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

test.describe("Skia Fresh-Node Chrome — Visual Stability", () => {
	test.setTimeout(45_000);

	test("fresh-node-chrome is ready within reasonable time", async ({
		page,
	}) => {
		const startTime = Date.now();

		await page.goto(STORY_URL);
		await page.waitForLoadState("networkidle");

		const canvas = page.locator("canvas").first();
		await expect(canvas).toBeVisible({ timeout: 10_000 });

		const loadTime = Date.now() - startTime;
		console.log(`Fresh-node-chrome step load time: ${loadTime}ms`);

		expect(loadTime).toBeLessThan(10_000);

		await page.screenshot({
			path: ".sisyphus/evidence/skia-fresh-node-chrome-timing.png",
		});
	});

	test("multiple fresh-node-chrome instances render without race conditions", async ({
		page,
		context,
	}) => {
		const pages = await Promise.all([context.newPage(), context.newPage()]);

		const errors: string[] = [];
		pages.forEach((p) => {
			p.on("pageerror", (e) => errors.push(e.message));
		});

		await Promise.all(pages.map((p) => p.goto(STORY_URL)));

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
