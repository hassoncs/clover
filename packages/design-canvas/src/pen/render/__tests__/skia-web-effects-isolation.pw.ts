/**
 * Playwright test: Skia Web Effects Isolation
 *
 * Loads each effect class (Shadow, Blur, Backdrop) in total isolation
 * via Storybook iframe to identify which destabilizes CanvasKit/WASM.
 *
 * Run: npx playwright test packages/design-canvas/src/pen/render/__tests__/skia-web-effects-isolation.pw.ts
 * Requires: Storybook running on localhost:6007 (`pnpm storybook`)
 */

import { type Browser, chromium, type Page } from "playwright";

const STORYBOOK_BASE = "http://localhost:6007";
const IFRAME_URL = (storyId: string) =>
	`${STORYBOOK_BASE}/iframe.html?id=${storyId}&viewMode=story`;

const CANVAS_LOAD_TIMEOUT = 15_000;
const RENDER_SETTLE_MS = 3_000;

interface EffectTestCase {
	name: string;
	storyId: string;
}

const BASELINE_STAGES: EffectTestCase[] = [
	{ name: "SolidRect", storyId: "pen-skia-web-repro--solid-rect" },
	{ name: "RoundedRect", storyId: "pen-skia-web-repro--rounded-rect" },
];

const EFFECT_STAGES: EffectTestCase[] = [
	{ name: "Shadow Only", storyId: "pen-skia-web-repro--effect-shadow-only" },
	{ name: "Blur Only", storyId: "pen-skia-web-repro--effect-blur-only" },
	{
		name: "Backdrop Only",
		storyId: "pen-skia-web-repro--effect-backdrop-only",
	},
];

const ALL_COMBINED: EffectTestCase = {
	name: "All Effects Combined",
	storyId: "pen-skia-web-repro--effects",
};

const PEN_RENDERER_EFFECTS: EffectTestCase = {
	name: "PenRenderer with Effects",
	storyId: "pencil-canvas-features--fill-stroke-effects-and-selection",
};

interface TestResult {
	name: string;
	storyId: string;
	status: "pass" | "crash" | "error" | "timeout" | "no-canvas";
	errors: string[];
	consoleErrors: string[];
	durationMs: number;
	canvasFound: boolean;
	canvasHasPixels: boolean;
	diagnostics?: Record<string, unknown>;
}

async function testStory(
	browser: Browser,
	testCase: EffectTestCase,
): Promise<TestResult> {
	const result: TestResult = {
		name: testCase.name,
		storyId: testCase.storyId,
		status: "pass",
		errors: [],
		consoleErrors: [],
		durationMs: 0,
		canvasFound: false,
		canvasHasPixels: false,
	};

	const start = Date.now();
	let page: Page | null = null;

	try {
		const context = await browser.newContext();
		page = await context.newPage();

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

		const url = IFRAME_URL(testCase.storyId);
		const response = await page.goto(url, {
			timeout: CANVAS_LOAD_TIMEOUT,
			waitUntil: "domcontentloaded",
		});

		if (!response || response.status() >= 400) {
			result.status = "error";
			result.errors.push(
				`HTTP ${response?.status() ?? "no response"} loading ${url}`,
			);
			return result;
		}

		// Wait for CanvasKit WASM to initialize and render
		await page.waitForTimeout(RENDER_SETTLE_MS);

		if (result.status === "crash") return result;

		// Check for canvas element
		const canvasCount = await page.evaluate(() => {
			return document.querySelectorAll("canvas").length;
		});
		result.canvasFound = canvasCount > 0;

		if (!result.canvasFound) {
			result.status = "no-canvas";
			result.errors.push("No <canvas> element found after render settle");
			return result;
		}

		// Use screenshot-based pixel detection — WebGL readPixels fails on
		// CanvasKit's own context since we can't get a reference to it
		const canvasElement = page.locator("canvas").first();
		const screenshotBuffer = await canvasElement.screenshot();
		const bytes = new Uint8Array(screenshotBuffer);
		// PNG has a minimum size; a blank canvas screenshot is typically <200 bytes
		// A rendered canvas with actual content will be significantly larger
		const hasVisibleContent = bytes.length > 500;

		result.canvasHasPixels = hasVisibleContent;

		const diagnostics = await page.evaluate(() => {
			const canvas = document.querySelector("canvas");
			const ck = (globalThis as any).CanvasKit;
			return {
				canvasKitLoaded: !!ck,
				canvasKitType: typeof ck,
				canvasCount: document.querySelectorAll("canvas").length,
				canvasWidth: canvas?.width ?? 0,
				canvasHeight: canvas?.height ?? 0,
				webglSupported: !!document.createElement("canvas").getContext("webgl2"),
				storyRoot: !!document.querySelector("#storybook-root"),
				bodyHTML: document.body.innerHTML.slice(0, 500),
			};
		});

		result.diagnostics = diagnostics;

		if (!diagnostics.canvasKitLoaded) {
			result.errors.push("CanvasKit not loaded on globalThis");
		}

		const wasmCrashPatterns = [
			"RuntimeError",
			"abort",
			"WASM",
			"CanvasKit",
			"memory",
			"unreachable",
			"out of memory",
			"CompileError",
			"LinkError",
		];

		const wasmErrors = result.errors.filter((e) =>
			wasmCrashPatterns.some((p) => e.toLowerCase().includes(p.toLowerCase())),
		);

		if (wasmErrors.length > 0) {
			result.status = "crash";
		} else if (result.canvasFound && result.canvasHasPixels) {
			result.status = "pass";
		} else if (!result.canvasFound) {
			result.status = "no-canvas";
		} else {
			result.status = "pass";
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

function formatResult(r: TestResult): string {
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

	let line = `${icon} ${r.name.padEnd(25)} ${r.status.padEnd(10)} ${r.durationMs}ms`;
	line += r.canvasFound ? ` canvas:yes` : ` canvas:no`;
	line += r.canvasHasPixels ? ` pixels:yes` : ` pixels:NO`;
	if (r.errors.length > 0) {
		line += `\n   Errors: ${r.errors.map((e) => e.slice(0, 120)).join(" | ")}`;
	}
	if (r.diagnostics && !r.canvasHasPixels) {
		const d = r.diagnostics;
		line += `\n   Diag: CK=${d.canvasKitLoaded} webgl=${d.webglSupported} canvas=${d.canvasWidth}x${d.canvasHeight}`;
	}
	if (r.consoleErrors.length > 0) {
		const relevant = r.consoleErrors.filter(
			(e) =>
				!e.includes("favicon") &&
				!e.includes("hot-update") &&
				!e.includes("DevTools"),
		);
		if (relevant.length > 0) {
			line += `\n   Console: ${relevant.map((e) => e.slice(0, 120)).join(" | ")}`;
		}
	}
	return line;
}

async function main() {
	console.log("=== Skia Web Effects Isolation Test ===\n");
	console.log(`Storybook: ${STORYBOOK_BASE}`);
	console.log(`Canvas load timeout: ${CANVAS_LOAD_TIMEOUT}ms`);
	console.log(`Render settle: ${RENDER_SETTLE_MS}ms\n`);

	// Verify Storybook is running
	const browser = await chromium.launch({
		headless: true,
		args: [
			"--enable-webgl",
			"--use-gl=angle",
			"--enable-gpu-rasterization",
			"--ignore-gpu-blocklist",
		],
	});
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

	// Phase 1: Baseline — confirm non-effect stages work
	console.log("--- Phase 1: Baseline (non-effect stages) ---\n");
	const baselineResults: TestResult[] = [];
	for (const tc of BASELINE_STAGES) {
		const r = await testStory(browser, tc);
		baselineResults.push(r);
		console.log(formatResult(r));
		if (!r.canvasHasPixels && r.canvasFound) {
			console.log(
				`   ⚠️  Canvas exists but no pixels — CanvasKit may not be rendering`,
			);
		}
	}

	const baselinePassed = baselineResults.every((r) => r.status === "pass");
	if (!baselinePassed) {
		console.log(
			"\n⚠️  Baseline stages failed — Skia web rendering is broken at a fundamental level.",
		);
		console.log("   Fix baseline rendering before testing effects.\n");
	}

	// Phase 2: Isolated effects — one at a time
	console.log("\n--- Phase 2: Isolated Effects (one at a time) ---\n");
	const effectResults: TestResult[] = [];
	for (const tc of EFFECT_STAGES) {
		const r = await testStory(browser, tc);
		effectResults.push(r);
		console.log(formatResult(r));
	}

	// Phase 3: All effects combined
	console.log("\n--- Phase 3: All Effects Combined ---\n");
	const combinedResult = await testStory(browser, ALL_COMBINED);
	console.log(formatResult(combinedResult));

	// Phase 4: PenRenderer pipeline (uses PenEffectsRenderer with web guard)
	console.log("\n--- Phase 4: PenRenderer Pipeline (real effects.tsx) ---\n");
	const penResult = await testStory(browser, PEN_RENDERER_EFFECTS);
	console.log(formatResult(penResult));

	// Summary
	console.log("\n=== SUMMARY ===\n");

	const crashedEffects = effectResults.filter((r) => r.status !== "pass");
	const passedEffects = effectResults.filter((r) => r.status === "pass");

	if (crashedEffects.length === 0 && combinedResult.status === "pass") {
		console.log("✅ All effect classes render without crashes on web Skia.");
	} else {
		if (crashedEffects.length > 0) {
			console.log("💥 DESTABILIZING EFFECT CLASSES:");
			for (const r of crashedEffects) {
				console.log(`   - ${r.name}: ${r.status} (${r.errors.join(", ")})`);
			}
		}
		if (passedEffects.length > 0) {
			console.log("\n✅ STABLE EFFECT CLASSES:");
			for (const r of passedEffects) {
				console.log(`   - ${r.name}`);
			}
		}
		if (combinedResult.status !== "pass" && crashedEffects.length === 0) {
			console.log(
				"\n⚠️  Individual effects pass but combined fails — interaction bug between effect classes.",
			);
		}
	}

	// Machine-readable output
	const report = {
		timestamp: new Date().toISOString(),
		baseline: baselineResults.map((r) => ({
			name: r.name,
			status: r.status,
		})),
		effects: effectResults.map((r) => ({
			name: r.name,
			status: r.status,
			errors: r.errors,
		})),
		combined: {
			name: combinedResult.name,
			status: combinedResult.status,
			errors: combinedResult.errors,
		},
		verdict:
			crashedEffects.length > 0
				? `Destabilizing: ${crashedEffects.map((r) => r.name).join(", ")}`
				: combinedResult.status !== "pass"
					? "Interaction bug between effect classes"
					: "All stable",
	};

	console.log("\n--- JSON Report ---");
	console.log(JSON.stringify(report, null, 2));

	await browser.close();

	// Exit with failure if any effect crashed
	if (crashedEffects.length > 0 || combinedResult.status !== "pass") {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(2);
});
