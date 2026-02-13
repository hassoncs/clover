import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";

type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

interface MockWebSocket {
	sent: string[];
	closed: boolean;
	closeCode?: number;
	closeReason?: string;
	attachment: unknown;
	tags: string[];
	send(msg: string): void;
	close(code?: number, reason?: string): void;
	serializeAttachment(data: unknown): void;
	deserializeAttachment(): unknown;
}

function createMockWebSocket(tags: string[] = []): MockWebSocket {
	const ws: MockWebSocket = {
		sent: [],
		closed: false,
		attachment: null,
		tags,
		send(msg: string) {
			ws.sent.push(msg);
		},
		close(code?: number, reason?: string) {
			ws.closed = true;
			ws.closeCode = code;
			ws.closeReason = reason;
		},
		serializeAttachment(data: unknown) {
			ws.attachment = data;
		},
		deserializeAttachment() {
			return ws.attachment;
		},
	};
	return ws;
}

function createMockState(): {
	state: DurableObjectState;
	storage: Map<string, unknown>;
	webSockets: Map<string, MockWebSocket>;
} {
	const storage = new Map<string, unknown>();
	const webSockets = new Map<string, MockWebSocket>();

	const state = {
		storage: {
			get: vi.fn(async (key: string) => storage.get(key)),
			put: vi.fn(async (key: string, value: unknown) => {
				storage.set(key, value);
			}),
			delete: vi.fn(async (key: string) => storage.delete(key)),
			deleteAll: vi.fn(async () => storage.clear()),
			list: vi.fn(async () => new Map()),
			setAlarm: vi.fn(),
		},
		id: { toString: () => "test-party-room-id" },
		acceptWebSocket: vi.fn((ws: MockWebSocket, tags: string[]) => {
			const id = tags[0] ?? crypto.randomUUID();
			ws.tags = tags;
			webSockets.set(id, ws);
		}),
		getWebSockets: vi.fn((tag?: string) => {
			if (tag) {
				return Array.from(webSockets.values()).filter((ws) =>
					ws.tags.includes(tag),
				);
			}
			return Array.from(webSockets.values());
		}),
		getTags: vi.fn((ws: MockWebSocket) => ws.tags),
	} as unknown as DurableObjectState;

	return { state, storage, webSockets };
}

function makeRequest(
	method: string,
	path: string,
	body?: unknown,
	headers?: Record<string, string>,
): Request {
	const init: RequestInit = { method, headers: headers ?? {} };
	if (body) {
		init.body = JSON.stringify(body);
		(init.headers as Record<string, string>)["Content-Type"] =
			"application/json";
	}
	return new Request(`https://fake-host${path}`, init);
}

async function parseJson(response: Response): Promise<unknown> {
	return response.json();
}

async function initRoom(
	dobj: PartyRoomDO,
	hostId = "host-1",
	hostToken = "token-abc",
) {
	const res = await dobj.fetch(
		makeRequest("POST", "/init", { hostId, hostToken }),
	);
	expect(res.status).toBe(200);
	return { hostId, hostToken };
}

describe("PartyRoomDO", () => {
	let mockState: ReturnType<typeof createMockState>;
	let dobj: PartyRoomDO;

	beforeEach(() => {
		vi.useFakeTimers();
		mockState = createMockState();
		dobj = new PartyRoomDO(mockState.state);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Room initialization", () => {
		it("initializes a room with host", async () => {
			const res = await dobj.fetch(
				makeRequest("POST", "/init", {
					hostId: "host-1",
					hostToken: "token-abc",
				}),
			);
			expect(res.status).toBe(200);
			const data = (await parseJson(res)) as { ok: boolean };
			expect(data.ok).toBe(true);
		});

		it("rejects init without hostId", async () => {
			const res = await dobj.fetch(
				makeRequest("POST", "/init", { hostToken: "token-abc" }),
			);
			expect(res.status).toBe(400);
			const data = (await parseJson(res)) as { error: string };
			expect(data.error).toContain("hostId");
		});

		it("rejects init without hostToken", async () => {
			const res = await dobj.fetch(
				makeRequest("POST", "/init", { hostId: "host-1" }),
			);
			expect(res.status).toBe(400);
		});

		it("returns 404 for unknown routes", async () => {
			const res = await dobj.fetch(makeRequest("GET", "/unknown"));
			expect(res.status).toBe(404);
		});
	});

	describe("Player join → leave → cleanup lifecycle", () => {
		it("host connects and receives state update", async () => {
			await initRoom(dobj);

			const ws = createMockWebSocket(["host"]);
			ws.serializeAttachment({ role: "host", token: "token-abc" });

			await dobj.webSocketOpen(ws as unknown as WebSocket);

			expect(ws.sent.length).toBeGreaterThanOrEqual(1);
			const msg = JSON.parse(ws.sent[0]);
			expect(msg.type).toBe("state_update");
			expect(msg.state.phase).toBe("lobby");
			expect(msg.state.hostId).toBe("host-1");
		});

		it("player connects and broadcasts player_joined", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			const playerWs = createMockWebSocket(["player:p1"]);
			playerWs.serializeAttachment({
				role: "player",
				playerId: "p1",
				name: "Alice",
			});
			(mockState.state as any).acceptWebSocket(playerWs, ["player:p1"]);
			await dobj.webSocketOpen(playerWs as unknown as WebSocket);

			expect(playerWs.sent.length).toBeGreaterThanOrEqual(1);
			const stateMsg = JSON.parse(playerWs.sent[0]);
			expect(stateMsg.type).toBe("state_update");

			const hostMessages = hostWs.sent.map((s) => JSON.parse(s));
			const joinMsg = hostMessages.find(
				(m: { type: string }) => m.type === "player_joined",
			);
			expect(joinMsg).toBeDefined();
			expect(joinMsg.player.name).toBe("Alice");
		});

		it("removes player after disconnect + reconnect window expires", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			const playerWs = createMockWebSocket(["player:p1"]);
			playerWs.serializeAttachment({
				role: "player",
				playerId: "p1",
				name: "Bob",
			});
			(mockState.state as any).acceptWebSocket(playerWs, ["player:p1"]);
			await dobj.webSocketOpen(playerWs as unknown as WebSocket);

			hostWs.sent.length = 0;

			await dobj.webSocketClose(
				playerWs as unknown as WebSocket,
				1000,
				"bye",
				true,
			);

			await vi.advanceTimersByTimeAsync(60_000);

			const leftMsg = hostWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_left");
			expect(leftMsg).toBeDefined();
			expect(leftMsg.playerId).toBe("p1");
		});
	});

	describe("Reconnection", () => {
		it("reconnects within 60s window without player_left", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			const playerWs = createMockWebSocket(["player:p1"]);
			playerWs.serializeAttachment({
				role: "player",
				playerId: "p1",
				name: "Carol",
			});
			(mockState.state as any).acceptWebSocket(playerWs, ["player:p1"]);
			await dobj.webSocketOpen(playerWs as unknown as WebSocket);

			await dobj.webSocketClose(
				playerWs as unknown as WebSocket,
				1000,
				"bye",
				true,
			);

			hostWs.sent.length = 0;

			await vi.advanceTimersByTimeAsync(30_000);

			const reconnWs = createMockWebSocket(["player:p1"]);
			reconnWs.serializeAttachment({
				role: "player",
				playerId: "p1",
				name: "Carol",
			});
			(mockState.state as any).acceptWebSocket(reconnWs, ["player:p1"]);
			await dobj.webSocketOpen(reconnWs as unknown as WebSocket);

			const reconnectMsg = hostWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_reconnect");
			expect(reconnectMsg).toBeDefined();

			const leftMsg = hostWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_left");
			expect(leftMsg).toBeUndefined();
		});
	});

	describe("Rate limiting", () => {
		it("allows messages within rate limit", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			const validMessage = JSON.stringify({
				type: "phase_change",
				phase: "playing",
			});

			for (let i = 0; i < 10; i++) {
				await dobj.webSocketMessage(
					hostWs as unknown as WebSocket,
					validMessage,
				);
			}

			const errorMessages = hostWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "error");
			expect(errorMessages.length).toBe(0);
		});

		it("rejects messages exceeding rate limit", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			hostWs.sent.length = 0;

			const validMessage = JSON.stringify({
				type: "phase_change",
				phase: "playing",
			});

			for (let i = 0; i < 12; i++) {
				await dobj.webSocketMessage(
					hostWs as unknown as WebSocket,
					validMessage,
				);
			}

			const errorMessages = hostWs.sent
				.map((s) => JSON.parse(s))
				.filter(
					(m: { type: string; code?: string }) =>
						m.type === "error" && m.code === "RATE_LIMITED",
				);
			expect(errorMessages.length).toBeGreaterThan(0);
		});
	});

	describe("Cleanup", () => {
		it("cleans up on alarm", async () => {
			await initRoom(dobj);

			const hostWs = createMockWebSocket(["host"]);
			hostWs.serializeAttachment({ role: "host", token: "token-abc" });
			(mockState.state as any).acceptWebSocket(hostWs, ["host"]);
			await dobj.webSocketOpen(hostWs as unknown as WebSocket);

			await dobj.alarm();

			expect(hostWs.closed).toBe(true);
			expect(mockState.state.storage.deleteAll).toHaveBeenCalled();
		});
	});
});
