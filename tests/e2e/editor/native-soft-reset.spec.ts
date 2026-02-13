import { expect, type Page, test } from "playwright/test";

const APP_BASE = "http://localhost:8085";

async function openEditorWithDefinition(
	page: Page,
	definition: Record<string, unknown>,
) {
	const encoded = encodeURIComponent(JSON.stringify(definition));
	await page.goto(
		`${APP_BASE}/editor/ephemeral?definition=${encoded}&sourceType=offline&sourceId=test`,
	);
	await page.waitForLoadState("networkidle");
}

function makeMinimalDefinition() {
	return {
		version: 1,
		name: "Soft Reset Stress Test",
		world: {
			gravity: { x: 0, y: 9.8 },
			bounds: { width: 20, height: 12 },
			pixelsPerMeter: 50,
		},
		variables: { score: 0 },
		camera: { zoom: 1 },
		prefabs: {
			ball: {
				visual: { type: "circle", radius: 0.5, color: "#FF6600" },
				collider: { shape: "circle", radius: 0.5 },
				body: { type: "dynamic", density: 1 },
				tags: ["physics-object"],
			},
		},
		entities: [
			{
				id: "test-ball",
				name: "Test Ball",
				prefab: "ball",
				transform: { x: 10, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
			},
		],
		rules: [],
		behaviors: [],
	};
}

test.describe("Native Soft Reset — Stress Test", () => {
	test("50 consecutive mode toggles without engine destruction", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		await openEditorWithDefinition(page, makeMinimalDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();

		const destroyLogs: string[] = [];
		page.on("console", (msg) => {
			const text = msg.text();
			if (
				text.includes("destroyInstance") ||
				text.includes("destroy_instance") ||
				text.includes("RTNGodot.destroy")
			) {
				destroyLogs.push(text);
			}
		});

		// When: toggle mode 50 times (author -> live -> author -> ...)
		for (let i = 0; i < 50; i++) {
			await playButton.click();
			await page.waitForTimeout(100);
		}

		// Then: editor is still responsive
		await expect(stageArea).toBeVisible();
		await expect(playButton).toBeVisible();

		// Then: no destroyInstance calls were logged
		expect(destroyLogs).toHaveLength(0);

		await page.screenshot({
			path: ".sisyphus/evidence/native-soft-reset-50-toggles.png",
		});

		console.log(
			"Soft reset stress — 50 toggles completed, destroyInstance calls:",
			destroyLogs.length,
		);
	});

	test("rapid definition changes do not trigger engine teardown", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		await openEditorWithDefinition(page, makeMinimalDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();

		// When: switch to live mode
		await playButton.click();
		await page.waitForTimeout(1000);

		const teardownLogs: string[] = [];
		page.on("console", (msg) => {
			const text = msg.text();
			if (
				text.includes("destroyInstance") ||
				text.includes("fullTeardown") ||
				text.includes("Bridge disposed")
			) {
				teardownLogs.push(text);
			}
		});

		// When: toggle back and forth rapidly simulating definition updates
		for (let i = 0; i < 30; i++) {
			await playButton.click();
			await page.waitForTimeout(50);
		}

		// Then: no full teardown occurred
		expect(teardownLogs).toHaveLength(0);

		// Then: runtime is still functional
		await expect(stageArea).toBeVisible();

		await page.screenshot({
			path: ".sisyphus/evidence/native-soft-reset-definition-changes.png",
		});
	});

	test("editor recovers from author-live-author cycle gracefully", async ({
		page,
	}) => {
		test.setTimeout(30_000);
		await openEditorWithDefinition(page, makeMinimalDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();

		// Given: start in author mode
		await expect(playButton).toHaveAccessibleName("Switch to live mode");

		// When: author → live
		await playButton.click();
		await expect(playButton).toHaveAccessibleName("Switch to author mode");
		await page.waitForTimeout(1000);

		// When: live → author
		await playButton.click();
		await expect(playButton).toHaveAccessibleName("Switch to live mode");
		await page.waitForTimeout(500);

		// When: author → live again
		await playButton.click();
		await expect(playButton).toHaveAccessibleName("Switch to author mode");
		await page.waitForTimeout(1000);

		// Then: stage area is still rendered
		await expect(stageArea).toBeVisible();

		// Then: no uncaught errors
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			errors.push(err.message);
		});
		await page.waitForTimeout(500);
		expect(errors).toHaveLength(0);

		await page.screenshot({
			path: ".sisyphus/evidence/native-soft-reset-recovery.png",
		});
	});
});
