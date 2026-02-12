import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:8789";
const AUTH_HEADER = { Authorization: "Bearer dev-token" };

interface TrpcResult<T> {
	result: { data: T };
}

interface SendMessageResult {
	threadId: string;
	streamUrl: string;
	status: string | null;
	text: string | null;
	pendingAskUser: unknown;
	error: string | null;
}

interface CreateGameResult {
	id: string;
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

const MINIMAL_GAME_DEFINITION = JSON.stringify({
	title: "Integration Test Game",
	world: {
		width: 10,
		height: 15,
		gravity: { x: 0, y: 9.8 },
	},
	entities: [],
	rules: [],
});

describe("Chat Stream Integration", () => {
	it(
		"sends a message and receives RUN_STARTED, TEXT_MESSAGE_CONTENT, and RUN_FINISHED events via SSE",
		async () => {
			const game = await trpcMutation<CreateGameResult>("games.create", {
				title: "Stream Integration Test",
				definition: MINIMAL_GAME_DEFINITION,
				isPublic: false,
			});

			expect(game.id).toBeDefined();

			const sendResult = await trpcMutation<SendMessageResult>(
				"chatThreads.sendMessage",
				{
					gameId: game.id,
					text: "Say hello in one short sentence.",
				},
			);

			expect(sendResult.threadId).toBeDefined();
			expect(sendResult.streamUrl).toContain("/api/chat/stream");
			expect(sendResult.streamUrl).toContain("threadId=");
			expect(sendResult.streamUrl).toContain("token=");

			const streamUrl = `${BASE_URL}${sendResult.streamUrl}`;
			const events = await readSseStream(streamUrl, 30_000);

			expect(events.length).toBeGreaterThan(0);

			const eventTypes = events.map((e) => e.type);

			expect(eventTypes[0]).toBe("RUN_STARTED");

			expect(eventTypes).toContain("TEXT_MESSAGE_CONTENT");

			const lastEvent = eventTypes[eventTypes.length - 1];
			expect(lastEvent).toBe("RUN_FINISHED");

			const runStarted = events.find((e) => e.type === "RUN_STARTED");
			expect(runStarted).toMatchObject({
				type: "RUN_STARTED",
				threadId: sendResult.threadId,
			});

			const textContent = events.filter(
				(e) => e.type === "TEXT_MESSAGE_CONTENT",
			);
			expect(textContent.length).toBeGreaterThan(0);
			for (const event of textContent) {
				expect(typeof event.delta).toBe("string");
				expect(typeof event.messageId).toBe("string");
			}

			const runFinished = events.find((e) => e.type === "RUN_FINISHED");
			expect(runFinished).toMatchObject({
				type: "RUN_FINISHED",
				threadId: sendResult.threadId,
			});
		},
		{ timeout: 60_000 },
	);
});
