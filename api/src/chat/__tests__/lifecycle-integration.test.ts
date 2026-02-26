import { describe, expect, it } from "vitest";

const BASE_URL = "http://api.slopcade.localhost:1355";
const AUTH_HEADER = { Authorization: "Bearer dev-token" };

interface TrpcResult<T> {
	result: { data: T };
}

interface CreateGameResult {
	id: string;
}

interface SendMessageResult {
	threadId: string;
	streamUrl: string;
	status: string | null;
	text: string | null;
	pendingAskUser: unknown;
	error: string | null;
}

interface WorkspaceFile {
	filename: string;
	content: string;
	contentHash: string;
	size: number;
}

interface WorkspaceSnapshot {
	gameId: string;
	revision: string;
	generatedAt: number;
	files: WorkspaceFile[];
}

interface WorkspaceSnapshotResult {
	changed: boolean;
	snapshot?: WorkspaceSnapshot;
}

interface SseEvent {
	type: string;
	[key: string]: unknown;
}

async function trpcMutation<T>(
	procedure: string,
	input: Record<string, unknown>,
): Promise<T> {
	const response = await fetch(`${BASE_URL}/trpc/${procedure}`, {
		method: "POST",
		headers: {
			...AUTH_HEADER,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`tRPC ${procedure} failed (${response.status}): ${text}`);
	}

	const json = (await response.json()) as TrpcResult<T>;
	return json.result.data;
}

async function trpcQuery<T>(
	procedure: string,
	input: Record<string, unknown>,
): Promise<T> {
	const params = encodeURIComponent(JSON.stringify(input));
	const response = await fetch(
		`${BASE_URL}/trpc/${procedure}?input=${params}`,
		{
			method: "GET",
			headers: AUTH_HEADER,
		},
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`tRPC ${procedure} failed (${response.status}): ${text}`);
	}

	const json = (await response.json()) as TrpcResult<T>;
	return json.result.data;
}

async function readSseStream(
	url: string,
	timeoutMs: number,
): Promise<SseEvent[]> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`SSE stream failed (${response.status}): ${text}`);
		}

		const reader = response.body?.getReader();
		if (!reader) throw new Error("No response body");

		const decoder = new TextDecoder();
		let buffer = "";
		const events: SseEvent[] = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			const chunks = buffer.split("\n\n");
			buffer = chunks.pop() ?? "";

			for (const chunk of chunks) {
				const parsed = parseSseEvents(chunk + "\n\n");
				events.push(...parsed);
			}
		}

		if (buffer.trim()) {
			const parsed = parseSseEvents(buffer + "\n\n");
			events.push(...parsed);
		}

		return events;
	} finally {
		clearTimeout(timeout);
	}
}

function parseSseEvents(raw: string): SseEvent[] {
	const events: SseEvent[] = [];
	const chunks = raw.split("\n\n");

	for (const chunk of chunks) {
		const lines = chunk.split("\n");
		const dataLines: string[] = [];

		for (const rawLine of lines) {
			const line = rawLine.trimEnd();
			if (!line || line.startsWith(":")) continue;
			if (line.startsWith("data:")) {
				dataLines.push(line.slice(5).trimStart());
			}
		}

		if (dataLines.length === 0) continue;

		try {
			const event = JSON.parse(dataLines.join("\n")) as SseEvent;
			events.push(event);
		} catch {}
	}

	return events;
}

const MINIMAL_GAME_DEFINITION = JSON.stringify({
	title: "Lifecycle Test Game",
	world: {
		width: 10,
		height: 15,
		gravity: { x: 0, y: 9.8 },
	},
	entities: [],
});

describe("Full Game Lifecycle Integration", () => {
	it(
		"creates a game, chats with AI to generate content, and verifies workspace files are created",
		async () => {
			// ============================================================
			// STEP 1: Create a game
			// ============================================================
			console.log("[lifecycle] Step 1: Creating game...");
			const game = await trpcMutation<CreateGameResult>("games.create", {
				title: "Lifecycle Integration Test",
				definition: MINIMAL_GAME_DEFINITION,
				isPublic: false,
			});

			expect(game.id).toBeDefined();
			console.log("[lifecycle] Game created:", game.id);

			// ============================================================
			// STEP 2: Scaffold workspace via initial message
			// ============================================================
			console.log("[lifecycle] Step 2: Checking initial workspace...");

			const scaffoldResult = await trpcMutation<SendMessageResult>(
				"chatThreads.sendMessage",
				{
					gameId: game.id,
					text: "Hello",
				},
			);

			const scaffoldStreamUrl = `${BASE_URL}${scaffoldResult.streamUrl}`;
			await readSseStream(scaffoldStreamUrl, 60_000);

			const initialSnapshot = await trpcQuery<WorkspaceSnapshotResult>(
				"chatThreads.getWorkspaceSnapshot",
				{ gameId: game.id },
			);

			expect(initialSnapshot.changed).toBe(true);
			expect(initialSnapshot.snapshot).toBeDefined();

			const initialFiles =
				initialSnapshot.snapshot?.files.map((f) => f.filename).sort() ?? [];
			console.log("[lifecycle] Initial workspace files:", initialFiles);

			expect(initialFiles).toContain("slopcade.json");
			expect(initialFiles).toContain("world.json");
			expect(initialFiles).toContain("entities.json");
			expect(initialFiles).toContain("scripts/main.js");

			// ============================================================
			// STEP 3: Send a chat message that instructs AI to create game content
			// ============================================================
			console.log("[lifecycle] Step 3: Sending game creation prompt to AI...");

			const sendResult = await trpcMutation<SendMessageResult>(
				"chatThreads.sendMessage",
				{
					gameId: game.id,
					threadId: scaffoldResult.threadId,
					text: [
						"Create a simple bouncing ball game. Please write these files:",
						"1. Update world.json with gravity and a dark blue background",
						"2. Create a ball prefab at prefabs/ball.json with a circle visual, dynamic physics, and a bounce behavior",
						"3. Update entities.json with one ball entity placed near the top of the world",
						"4. Write a script in scripts/main.js that tracks bounces using onCollision",
						"Do NOT use askUser. Just write the files directly.",
					].join("\n"),
				},
			);

			expect(sendResult.threadId).toBeDefined();
			expect(sendResult.streamUrl).toContain("/api/chat/stream");

			// ============================================================
			// STEP 4: Read the SSE stream and verify AI used tools
			// ============================================================
			console.log("[lifecycle] Step 4: Reading AI stream...");

			const streamUrl = `${BASE_URL}${sendResult.streamUrl}`;
			const events = await readSseStream(streamUrl, 120_000);

			expect(events.length).toBeGreaterThan(0);

			const eventTypes = events.map((e) => e.type);
			console.log("[lifecycle] Event types received:", [
				...new Set(eventTypes),
			]);

			expect(eventTypes[0]).toBe("RUN_STARTED");
			expect(eventTypes[eventTypes.length - 1]).toBe("RUN_FINISHED");

			const toolCallStarts = events.filter((e) => e.type === "TOOL_CALL_START");
			const toolCallResults = events.filter(
				(e) => e.type === "TOOL_CALL_RESULT",
			);

			console.log(
				"[lifecycle] Tool calls made:",
				toolCallStarts.map((e) => e.toolName),
			);

			const writeFileCalls = toolCallStarts.filter(
				(e) => e.toolName === "writeFile",
			);
			expect(writeFileCalls.length).toBeGreaterThan(0);
			console.log(
				`[lifecycle] AI made ${writeFileCalls.length} writeFile call(s)`,
			);

			expect(toolCallResults.length).toBeGreaterThanOrEqual(
				writeFileCalls.length,
			);

			for (const result of toolCallResults) {
				if (typeof result.result === "string") {
					const parsed = JSON.parse(result.result);
					if (parsed.ok !== undefined) {
						expect(parsed.ok).toBe(true);
					}
				}
			}

			// ============================================================
			// STEP 5: Verify workspace files were actually written
			// ============================================================
			console.log("[lifecycle] Step 5: Verifying workspace files...");

			const finalSnapshot = await trpcQuery<WorkspaceSnapshotResult>(
				"chatThreads.getWorkspaceSnapshot",
				{ gameId: game.id },
			);

			expect(finalSnapshot.changed).toBe(true);
			expect(finalSnapshot.snapshot).toBeDefined();

			const finalFiles = finalSnapshot.snapshot!.files;
			const finalFilenames = finalFiles.map((f) => f.filename).sort();
			console.log("[lifecycle] Final workspace files:", finalFilenames);

			const worldJson = finalFiles.find((f) => f.filename === "world.json");
			expect(worldJson).toBeDefined();
			expect(worldJson!.content.length).toBeGreaterThan(10);

			const worldData = JSON.parse(worldJson!.content);
			expect(worldData).toBeDefined();
			expect(worldData.gravity).toBeDefined();
			console.log("[lifecycle] world.json is valid JSON ✓");

			const ballPrefab = finalFiles.find(
				(f) => f.filename.includes("ball") && f.filename.startsWith("prefabs/"),
			);
			if (ballPrefab) {
				const prefabData = JSON.parse(ballPrefab.content);
				expect(prefabData).toBeDefined();
				console.log("[lifecycle] Ball prefab created ✓:", ballPrefab.filename);
			} else {
				console.log(
					"[lifecycle] Note: AI did not create a separate ball prefab file (may have used a different approach)",
				);
			}

			const entitiesJson = finalFiles.find(
				(f) => f.filename === "entities.json",
			);
			expect(entitiesJson).toBeDefined();
			const entitiesData = JSON.parse(entitiesJson!.content);
			expect(entitiesData).toBeDefined();
			console.log(
				"[lifecycle] entities.json is valid JSON ✓, entity count:",
				Array.isArray(entitiesData) ? entitiesData.length : "non-array",
			);

			const hasScripts = finalFilenames.some((f) => f.startsWith("scripts/"));
			expect(hasScripts).toBe(true);
			console.log("[lifecycle] scripts directory present ✓");

			// ============================================================
			// SUMMARY
			// ============================================================
			console.log("\n[lifecycle] ════════════════════════════════════════");
			console.log("[lifecycle] LIFECYCLE TEST PASSED ✓");
			console.log("[lifecycle] ════════════════════════════════════════");
			console.log(`[lifecycle] Game ID: ${game.id}`);
			console.log(`[lifecycle] Thread ID: ${sendResult.threadId}`);
			console.log(`[lifecycle] Files in workspace: ${finalFilenames.length}`);
			console.log(`[lifecycle] writeFile calls: ${writeFileCalls.length}`);
			console.log(`[lifecycle] Total SSE events: ${events.length}`);
			console.log("[lifecycle] ════════════════════════════════════════\n");
		},
		{ timeout: 180_000 },
	);
});
