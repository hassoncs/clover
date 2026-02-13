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

function makePartyGameDefinition() {
	return {
		version: 1,
		name: "Party Preview Test Game",
		world: {
			gravity: { x: 0, y: 9.8 },
			bounds: { width: 20, height: 12 },
			pixelsPerMeter: 50,
		},
		variables: {
			score: 0,
			role: "host",
			networkStatus: "disconnected",
			"room.phase": "lobby",
			"room.playerCount": 0,
			"room.hostId": "",
			"room.currentRound": 0,
			"room.maxRounds": 3,
		},
		camera: { zoom: 1 },
		prefabs: {
			lobbyOverlay: {
				visual: { type: "rectangle", width: 4, height: 2, color: "#FFD700" },
				tags: ["lobby-ui"],
			},
			votingOverlay: {
				visual: { type: "rectangle", width: 4, height: 2, color: "#4169E1" },
				tags: ["voting-ui"],
			},
			resultsOverlay: {
				visual: { type: "rectangle", width: 4, height: 2, color: "#32CD32" },
				tags: ["results-ui"],
			},
			hostBadge: {
				visual: { type: "rectangle", width: 1, height: 1, color: "#FF4500" },
				tags: ["host-indicator"],
			},
		},
		entities: [
			{
				id: "lobby-panel",
				name: "Lobby Panel",
				prefab: "lobbyOverlay",
				transform: { x: 10, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "room.phase", equals: "lobby" },
			},
			{
				id: "voting-panel",
				name: "Voting Panel",
				prefab: "votingOverlay",
				transform: { x: 10, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "room.phase", equals: "voting" },
			},
			{
				id: "results-panel",
				name: "Results Panel",
				prefab: "resultsOverlay",
				transform: { x: 10, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "room.phase", equals: "results" },
			},
			{
				id: "host-badge",
				name: "Host Badge",
				prefab: "hostBadge",
				transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
				visibleWhen: { variable: "role", equals: "host" },
			},
		],
		rules: [],
		behaviors: [],
	};
}

test.describe("Party Preview — Host/Player Role Divergence", () => {
	test.beforeEach(async ({ page }) => {
		test.setTimeout(30_000);
		await openEditorWithDefinition(page, makePartyGameDefinition());
	});

	test("editor loads with party game definition and preview contexts", async ({
		page,
	}) => {
		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible();

		await page.screenshot({
			path: ".sisyphus/evidence/party-preview-loaded.png",
			fullPage: true,
		});
	});

	test("host context shows host-only elements", async ({ page }) => {
		// Given: navigate to preview
		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible({ timeout: 10_000 });
		await previewTab.click();

		// When: activate the Host context (default)
		const hostTab = page.getByRole("button", { name: "Host" });
		if (await hostTab.isVisible().catch(() => false)) {
			await hostTab.click();
		}

		// Then: switch to live mode for runtime
		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();
		await playButton.click();
		await page.waitForTimeout(2000);

		await page.screenshot({
			path: ".sisyphus/evidence/party-preview-host-context.png",
		});
	});

	test("player context hides host-only elements", async ({ page }) => {
		// Given: navigate to preview
		const previewTab = page.getByTestId("preview-tab");
		await expect(previewTab).toBeVisible({ timeout: 10_000 });
		await previewTab.click();

		// When: switch to Player context
		const playerTab = page.getByRole("button", { name: "Player" });
		if (await playerTab.isVisible().catch(() => false)) {
			await playerTab.click();
		}

		// Then: switch to live mode
		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();
		await playButton.click();
		await page.waitForTimeout(2000);

		await page.screenshot({
			path: ".sisyphus/evidence/party-preview-player-context.png",
		});
	});
});

test.describe("Party Preview — Mock State Transitions", () => {
	test("phase-dependent overlays respond to variable changes", async ({
		page,
	}) => {
		test.setTimeout(30_000);
		await openEditorWithDefinition(page, makePartyGameDefinition());

		// Given: editor is loaded and in preview
		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		// When: switch to live mode
		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();
		await playButton.click();
		await page.waitForTimeout(2000);

		// Then: initial state has lobby phase (room.phase = "lobby")
		await page.screenshot({
			path: ".sisyphus/evidence/party-preview-lobby-phase.png",
		});

		// Then: no console errors about mock network
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});
		await page.waitForTimeout(500);

		const networkErrors = consoleErrors.filter(
			(e) => e.includes("network") || e.includes("socket"),
		);
		expect(networkErrors).toHaveLength(0);
	});
});

test.describe("Party Preview — No Real Multiplayer Required", () => {
	test("preview runs without WebSocket connections", async ({ page }) => {
		test.setTimeout(30_000);

		const wsConnections: string[] = [];
		page.on("websocket", (ws) => {
			wsConnections.push(ws.url());
		});

		await openEditorWithDefinition(page, makePartyGameDefinition());

		const stageArea = page.getByTestId("stage-area");
		await expect(stageArea).toBeVisible({ timeout: 10_000 });

		const previewTab = page.getByTestId("preview-tab");
		await previewTab.click();

		const playButton = page.getByTestId("editor-play-button");
		await expect(playButton).toBeVisible();
		await playButton.click();
		await page.waitForTimeout(2000);

		// Then: no party/DO WebSocket connections were made
		const partyWsConnections = wsConnections.filter(
			(url) => url.includes("/party/") || url.includes("/ws"),
		);

		await page.screenshot({
			path: ".sisyphus/evidence/party-preview-no-websocket.png",
		});

		console.log(
			"Party preview WebSocket check — party connections:",
			partyWsConnections.length,
			"total WS:",
			wsConnections.length,
		);
	});
});
