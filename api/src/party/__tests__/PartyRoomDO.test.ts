import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";

type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

class MockWebSocket {
	static OPEN = 1;
	static CLOSED = 3;
	listeners: Record<string, any[]> = {};
	sent: string[] = []; // Messages received by THIS socket
	readyState = 1; // OPEN
	other?: MockWebSocket;

	addEventListener(type: string, listener: any) {
		this.listeners[type] = this.listeners[type] || [];
		this.listeners[type].push(listener);
	}

	removeEventListener(type: string, listener: any) {
		this.listeners[type] = (this.listeners[type] || []).filter(
			(l) => l !== listener,
		);
	}

	send(data: string) {
		if (this.other) {
			this.other.sent.push(data);
			// Trigger message event on the other side
			const event = { data };
			for (const l of this.other.listeners["message"] || []) {
				l(event);
			}
		}
	}

	close(code?: number, reason?: string) {
		this.readyState = 3; // CLOSED
		const event = { code, reason, wasClean: true };
		for (const l of this.listeners["close"] || []) {
			l(event);
		}
		if (this.other) {
			this.other.readyState = 3;
			for (const l of this.other.listeners["close"] || []) {
				l(event);
			}
		}
	}

	accept() {}
}

class MockWebSocketPair {
	0: MockWebSocket;
	1: MockWebSocket;
	constructor() {
		this[0] = new MockWebSocket();
		this[1] = new MockWebSocket();
		this[0].other = this[1];
		this[1].other = this[0];
	}
}

// Mock Response to support webSocket property
const OriginalResponse = global.Response;
class MockResponse extends OriginalResponse {
	webSocket: any;
	constructor(body: any, init: any) {
		if (init?.status === 101) {
			super(body, { ...init, status: 200 });
			Object.defineProperty(this, "status", { value: 101 });
		} else {
			super(body, init);
		}
		this.webSocket = init?.webSocket;
	}
}

// Stub globals
(global as any).WebSocketPair = MockWebSocketPair;
(global as any).WebSocket = MockWebSocket;
(global as any).Response = MockResponse;

function createMockState(): {
	state: DurableObjectState;
	storage: Map<string, unknown>;
} {
	const storage = new Map<string, unknown>();

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
	} as unknown as DurableObjectState;

	return { state, storage };
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

			const res = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			expect(res.status).toBe(101);
			const clientWs = (res as any).webSocket as MockWebSocket;

			// Wait for async handleHostConnect
			await vi.runAllTimersAsync();

			expect(clientWs.sent.length).toBeGreaterThanOrEqual(1);
			const msg = JSON.parse(clientWs.sent[0]);
			expect(msg.type).toBe("state_update");
			expect(msg.state.phase).toBe("lobby");
			expect(msg.state.hostId).toBe("host-1");
		});

		it("player connects and broadcasts player_joined", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Alice", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = (playerRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();

			expect(playerClientWs.sent.length).toBeGreaterThanOrEqual(1);
			const stateMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			expect(stateMsg.type).toBe("state_update");

			const hostMessages = hostClientWs.sent.map((s) => JSON.parse(s));
			const joinMsg = hostMessages.find(
				(m: { type: string }) => m.type === "player_joined",
			);
			expect(joinMsg).toBeDefined();
			expect(joinMsg.player.name).toBe("Alice");
		});

		it("removes player after disconnect + reconnect window expires", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Bob", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = (playerRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();
			hostClientWs.sent.length = 0;

			playerClientWs.close(1000, "bye");

			await vi.advanceTimersByTimeAsync(60_000);

			const leftMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_left");
			expect(leftMsg).toBeDefined();
		});
	});

	describe("Reconnection", () => {
		it("reconnects within 60s window without player_left", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Carol", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = (playerRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();

			// Get the token from player token message
			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const playerId = tokenMsg.playerId;

			playerClientWs.close(1000, "bye");

			hostClientWs.sent.length = 0;

			await vi.advanceTimersByTimeAsync(30_000);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = (reconnRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();

			const reconnectMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_reconnect");
			expect(reconnectMsg).toBeDefined();
			expect(reconnectMsg.playerId).toBe(playerId);

			const leftMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_left");
			expect(leftMsg).toBeUndefined();
		});
	});

	describe("Rate limiting", () => {
		it("allows messages within rate limit", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();

			const validMessage = JSON.stringify({
				type: "phase_change",
				phase: "playing",
			});

			for (let i = 0; i < 10; i++) {
				hostClientWs.send(validMessage);
			}

			await vi.runAllTimersAsync();

			const errorMessages = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "error");
			expect(errorMessages.length).toBe(0);
		});

		it("rejects messages exceeding rate limit", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();
			hostClientWs.sent.length = 0;

			const validMessage = JSON.stringify({
				type: "phase_change",
				phase: "playing",
			});

			for (let i = 0; i < 12; i++) {
				hostClientWs.send(validMessage);
			}

			await vi.runAllTimersAsync();

			const errorMessages = hostClientWs.sent
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

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = (hostRes as any).webSocket as MockWebSocket;

			await vi.runAllTimersAsync();

			await dobj.alarm();

			expect(hostClientWs.readyState).toBe(3); // CLOSED
			expect(mockState.state.storage.deleteAll).toHaveBeenCalled();
		});
	});
});
