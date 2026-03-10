/**
 * Playwright test: Skia Web Fresh Node Chrome Animation Stability
 *
 * Tests the minimal Skia-only fresh-node chrome rendering:
 * - Scale animation (0.985 → 1)
 * - Ring dash animation (DashPathEffect with animated phase)
 * - Opacity fade animation
 *
 * PURPOSE:
 * Verify that reanimated shared values + Skia transforms work on web
 * without HTML fallback and without CanvasKit/WASM crashes.
 *
 * Run: npx playwright test packages/design-canvas/src/pen/render/__tests__/skia-web-fresh-node-chrome.pw.ts
 * Requires: Storybook running on localhost:6007 (`pnpm storybook`)
 */

import { type Browser, chromium, type Page } from "playwright";

const STORYBOOK_BASE = "http://localhost:6007";
const FRESH_NODE_STORY_ID = "pen-skia-web-repro--fresh-node-chrome";
const IFRAME_URL = `${STORYBOOK_BASE}/iframe.html?id=${FRESH_NODE_STORY_ID}&viewMode=story`;

const CANVAS_LOAD_TIMEOUT = 15_000;
const ANIMATION_STABILITY_MS = 4_000;
const SCREENSHOT_DIR = import.meta.dirname + "/screenshots";

interface AnimationTestResult {
	status: "pass" | "crash" | "error" | "timeout" | "no-canvas";
	errors: string[];
	consoleErrors: string[];
	durationMs: number;
	canvasFound: boolean;
	screenshots: string[];
	animationFrameCount: number;
	memoryGrowthKB: number | null;
}

async function testFreshNodeChrome(
	browser: Browser,
): Promise<AnimationTestResult> {
	const result: AnimationTestResult = {
		status: "pass",
		errors: [],
		consoleErrors: [],
		durationMs: 0,
		canvasFound: false,
		screenshots: [],
		animationFrameCount: 0,
		memoryGrowthKB: null,
	};

	const start = Date.now();
	let page: Page | null = null;

	try {
		const context = await browser.newContext({
			viewport: { width: 400, height: 300 },
		});
		page = await context.newPage();

		// Track all errors
		page.on("pageerror", (err) => {
			result.errors.push(err.message);
		});

		page.on("console", (msg) => {
			if (msg.type() === "error") {
				result.consoleErrors.push(msg.text());
			}
		});

		page.on("crash", () => {
			result.status = "crash";
			result.errors.push("PAGE CRASHED");
		});

		// Load the story
		console.log(`Loading: ${IFRAME_URL}`);
		const response = await page.goto(IFRAME_URL, {
			timeout: CANVAS_LOAD_TIMEOUT,
			waitUntil: "domcontentloaded",
		});

		if (!response || response.status() >= 400) {
			result.status = "error";
			result.errors.push(
				`HTTP ${response?.status() ?? "no response"} loading story`,
			);
			return result;
		}

		// Wait for CanvasKit WASM to initialize
		await page.waitForTimeout(2_000);

		if (result.status === "crash") return result;

		// Verify canvas exists
		const canvasCount = await page.evaluate(() => {
			return document.querySelectorAll("canvas").length;
		});
		result.canvasFound = canvasCount > 0;

		if (!result.canvasFound) {
			result.status = "no-canvas";
			result.errors.push("No <canvas> element found");
			return result;
		}

		console.log("Canvas found, monitoring animation stability...");

		// Capture initial memory (if available)
		const initialMemory = await page.evaluate(() => {
			// @ts-expect-error - performance.memory is Chrome-specific
			return performance.memory?.usedJSHeapSize ?? null;
		});

		// Take initial screenshot
		const startScreenshot = `${SCREENSHOT_DIR}/fresh-node-start.png`;
		await page.screenshot({ path: startScreenshot, fullPage: false });
		result.screenshots.push(startScreenshot);
		console.log(`  Screenshot: ${startScreenshot}`);

		// Monitor animation stability over time
		const monitorStart = Date.now();
		let frameCount = 0;

		while (Date.now() - monitorStart < ANIMATION_STABILITY_MS) {
			// Check for page crash every 500ms
			await page.waitForTimeout(500);

			if (result.status === "crash") {
				console.log("  ⚠️ Page crashed during animation");
				break;
			}

			// Count frames by checking rAF callbacks (indirect measure)
			const currentFrameCount = await page.evaluate(() => {
				// @ts-expect-error - accessing internal frame counter
				return window.__skiaFrameCount ?? (window.__skiaFrameCount = 0);
			});
			frameCount = Math.max(frameCount, currentFrameCount);
		}

		result.animationFrameCount = frameCount;

		// Take final screenshot
		const endScreenshot = `${SCREENSHOT_DIR}/fresh-node-end.png`;
		await page.screenshot({ path: endScreenshot, fullPage: false });
		result.screenshots.push(endScreenshot);
		console.log(`  Screenshot: ${endScreenshot}`);

		// Capture final memory
		const finalMemory = await page.evaluate(() => {
			// @ts-expect-error - performance.memory is Chrome-specific
			return performance.memory?.usedJSHeapSize ?? null;
		});

		if (initialMemory !== null && finalMemory !== null) {
			result.memoryGrowthKB = Math.round((finalMemory - initialMemory) / 1024);
		}

		// Check for WASM-related errors
		const wasmErrors = result.errors.filter(
			(e) =>
				e.includes("RuntimeError") ||
				e.includes("abort") ||
				e.includes("WASM") ||
				e.includes("CanvasKit") ||
				e.includes("memory") ||
				e.includes("unreachable") ||
				e.includes("out of bounds"),
		);

		if (wasmErrors.length > 0) {
			result.status = "crash";
			console.log(`  💥 WASM errors detected: ${wasmErrors.length}`);
		} else if (result.errors.length > 0) {
			// Check if errors are fatal or just warnings
			const fatalErrors = result.errors.filter(
				(e) =>
					!e.includes("Warning:") &&
					!e.includes("console.") &&
					!e.includes("favicon"),
			);
			if (fatalErrors.length > 0) {
				result.status = "error";
			}
		}

		await context.close();
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("Timeout")) {
			result.status = "timeout";
		} else {
			result.status = "error";
		}
		result.errors.push(msg);
		if (page) {
			try {
				await page.context().close();
			} catch {
				// ignore cleanup errors
			}
		}
	}

	result.durationMs = Date.now() - start;
	return result;
}

function formatResult(r: AnimationTestResult): string {
	const icon =
		r.status === "pass"
			? "✅"
			: r.status === "crash"
				? "💥"
				: r.status === "timeout"
					? "⏱️"
					: r.status === "no-canvas"
						? "🚫"
						: "❌";

	const lines = [
		"",
		"=== FRESH NODE CHROME ANIMATION TEST ===",
		"",
		`${icon} Status: ${r.status.toUpperCase()}`,
		`Duration: ${r.durationMs}ms`,
		`Canvas: ${r.canvasFound ? "✓" : "✗"}`,
		`Animation monitoring: ${ANIMATION_STABILITY_MS}ms`,
		`Screenshots: ${r.screenshots.length}`,
	];

	if (r.memoryGrowthKB !== null) {
		const memoryStatus =
			r.memoryGrowthKB > 5000
				? "⚠️ HIGH"
				: r.memoryGrowthKB > 1000
					? "⚡ MODERATE"
					: "✓ STABLE";
		lines.push(`Memory growth: ${r.memoryGrowthKB}KB ${memoryStatus}`);
	}

	if (r.errors.length > 0) {
		lines.push("", "Errors:");
		for (const e of r.errors.slice(0, 5)) {
			lines.push(`  - ${e.slice(0, 200)}`);
		}
	}

	if (r.consoleErrors.length > 0) {
		const relevant = r.consoleErrors.filter(
			(e) =>
				!e.includes("favicon") &&
				!e.includes("hot-update") &&
				!e.includes("DevTools"),
		);
		if (relevant.length > 0) {
			lines.push("", "Console Errors:");
			for (const e of relevant.slice(0, 5)) {
				lines.push(`  - ${e.slice(0, 200)}`);
			}
		}
	}

	return lines.join("\n");
}

async function main() {
	console.log("=== Skia Web Fresh Node Chrome Animation Stability Test ===\n");
	console.log(`Storybook: ${STORYBOOK_BASE}`);
	console.log(`Story ID: ${FRESH_NODE_STORY_ID}`);
	console.log(`Animation stability duration: ${ANIMATION_STABILITY_MS}ms\n`);

	// Verify Storybook is running
	const browser = await chromium.launch({ headless: true });
	try {
		const checkPage = await browser.newPage();
		try {
			await checkPage.goto(STORYBOOK_BASE, { timeout: 5000 });
		} catch {
			console.error(
				"❌ Storybook not running at " +
					STORYBOOK_BASE +
					"\n   Start it with: pnpm storybook",
			);
			process.exit(1);
		}
		await checkPage.close();
	} catch {
		console.error("❌ Could not launch browser");
		process.exit(1);
	}

	// Run the test
	const result = await testFreshNodeChrome(browser);
	console.log(formatResult(result));

	await browser.close();

	// Exit with appropriate code
	if (result.status === "pass") {
		console.log(
			"\n✅ Fresh node chrome animation is STABLE on Skia-only path.",
		);
		process.exit(0);
	} else {
		console.log(
			`\n❌ Fresh node chrome animation ${result.status.toUpperCase()}.`,
		);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(2);
});
