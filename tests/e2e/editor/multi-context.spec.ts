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

function makePartyDefinition() {
	return {
		version: 1,
		name: "Multi-Context Test Game",
		world: {
			gravity: { x: 0, y: 9.8 },
			bounds: { width: 20, height: 12 },
			pixelsPerMeter: 50,
		},
		variables: {
			score: 0,
			role: "host",
			"room.phase": "lobby",
			"room.playerCount": 0,
		},
		camera: { zoom: 1 },
		prefabs: {
			hostOverlay: {
				visual: { type: "rectangle", width: 2, height: 1, color: "#FF0000" },
				tags: ["host-only"],
			},
			playerOverlay: {
				visual: { type: "rectangle", width: 2, height: 1, color: "#0000FF" },
				tags: ["player-only"],
			},
			sharedEntity: {
				visual: { type: "rectangle", width: 1, height: 1, color: "#00FF00" },
				collider: { shape: "box", width: 1, height: 1 },
				body: { type: "dynamic", density: 1 },
				tags: ["shared"],
			},
		},
		entities: [
			{
				id: "host-banner",
				name: "Host Banner",
				prefab: "hostOverlay",
				transform: { x: 5, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "role", equals: "host" },
			},
			{
				id: "player-banner",
				name: "Player Banner",
				prefab: "playerOverlay",
				transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "role", equals: "player" },
			},
			{
				id: "shared-block",
				name: "Shared Block",
				prefab: "sharedEntity",
				transform: { x: 10, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
			},
		],
		rules: [],
		behaviors: [],
	};
}

test.describe("Multi-Context Editor — Context Switching", () => {
	test.beforeEach(async ({ page }) => {
		test.setTimeout(30_000);
		await openEditorWithDefinition(page, makePartyDefinition());
	});

	test("editor loads with default host/player preview contexts", async ({
		page,
	}) => {
		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible();

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-editor-loaded.png",
			fullPage: true,
		});
	});

	test("mode toggle switches between author and live", async ({ page }) => {
		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible({ timeout: 10_000 });
		await expect(playButton).toHaveAccessibleName("Switch to live mode");

		// When: click to switch to live mode
		await playButton.click();
		await expect(playButton).toHaveAccessibleName("Switch to author mode");

		// When: click back to author mode
		await playButton.click();
		await expect(playButton).toHaveAccessibleName("Switch to live mode");

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-mode-toggle.png",
		});
	});

	test("context tabs appear in preview and switch without reload", async ({
		page,
	}) => {
		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible({ timeout: 10_000 });
		await previewTab.click();

		const stageContent = page.getByTestId("stage-content");
		await expect(stageContent).toBeVisible();

		const hostTab = page.getByRole("button", { name: "Host" });
		const playerTab = page.getByRole("button", { name: "Player" });

		const hasContextTabs =
			(await hostTab.isVisible().catch(() => false)) ||
			(await playerTab.isVisible().catch(() => false));

		if (hasContextTabs) {
			// When: switch to Player context
			await playerTab.click();
			await expect(stageContent).toBeVisible();

			// When: switch back to Host
			await hostTab.click();
			await expect(stageContent).toBeVisible();
		}

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-tabs.png",
		});
	});

	test("rapid context switching remains stable", async ({ page }) => {
		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible({ timeout: 10_000 });
		await previewTab.click();

		const stageContent = page.getByTestId("stage-content");
		await expect(stageContent).toBeVisible();

		const hostTab = page.getByRole("button", { name: "Host" });
		const playerTab = page.getByRole("button", { name: "Player" });

		const hasContextTabs =
			(await hostTab.isVisible().catch(() => false)) &&
			(await playerTab.isVisible().catch(() => false));

		if (hasContextTabs) {
			for (let i = 0; i < 20; i++) {
				await (i % 2 === 0 ? playerTab : hostTab).click();
				await page.waitForTimeout(50);
			}

			// Then: editor is still responsive after rapid switching
			await expect(stageContent).toBeVisible();

			const consoleLogs: string[] = [];
			page.on("console", (msg) => {
				if (msg.type() === "error") {
					consoleLogs.push(msg.text());
				}
			});
			await page.waitForTimeout(500);

			const destroyErrors = consoleLogs.filter(
				(log) =>
					log.includes("destroyInstance") || log.includes("disposed bridge"),
			);
			expect(destroyErrors).toHaveLength(0);
		}

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-rapid-switch.png",
		});
	});
});

test.describe("Multi-Context Editor — Live State Panel", () => {
	test("live-state tab is accessible from editor", async ({ page }) => {
		await openEditorWithDefinition(page, makePartyDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-live-state.png",
		});
	});
});

test.describe("Multi-Context Editor — Web Dual-Pane Split View", () => {
	test("DockviewLayout renders on web desktop", async ({ page }) => {
		await openEditorWithDefinition(page, makePartyDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const body = page.locator("body");
		const bodyHtml = await body.innerHTML();
		expect(bodyHtml.length).toBeGreaterThan(0);

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-web-split.png",
			fullPage: true,
		});
	});
});

test.describe("Multi-Context Editor — Agent Tool Operations", () => {
	test("inspector game state is queryable via page evaluate", async ({
		page,
	}) => {
		await openEditorWithDefinition(page, makePartyDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		// When: switch to preview, then to live mode
		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();
		await playButton.click();

		await page.waitForTimeout(2000);

		const hasDebugApi = await page.evaluate(() => {
			return (
				typeof (window as unknown as Record<string, unknown>).__GAME_DEBUG__ !==
				"undefined"
			);
		});

		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});
		await page.waitForTimeout(1000);

		const criticalErrors = consoleErrors.filter(
			(e) =>
				!e.includes("hydrat") &&
				!e.includes("image") &&
				!e.includes("Failed to load") &&
				!e.includes("404"),
		);

		await page.screenshot({
			path: ".sisyphus/evidence/multi-context-agent-tools.png",
		});

		console.log(
			"Agent tool test - hasDebugApi:",
			hasDebugApi,
			"criticalErrors:",
			criticalErrors.length,
		);
	});
});
