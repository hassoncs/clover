import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";

type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

interface TrackedWebSocket extends WebSocket {
	sent: string[];
}

function trackWebSocket(ws: WebSocket): TrackedWebSocket {
	const tracked = ws as TrackedWebSocket;
	tracked.sent = [];
	ws.addEventListener("message", (event: MessageEvent) => {
		tracked.sent.push(
			typeof event.data === "string" ? event.data : String(event.data),
		);
	});
	return tracked;
}

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
			const clientWs = trackWebSocket((res as any).webSocket);

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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Alice", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Bob", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Carol", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

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
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

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

		it("reconnecting player receives active input request", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Dave", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;

			playerClientWs.sent.length = 0;

			hostClientWs.send(
				JSON.stringify({
					type: "input_request",
					requestId: "req-1",
					request: {
						prompt: "What is your answer?",
						inputType: "text",
						timeLimit: 60,
					},
				}),
			);

			await vi.advanceTimersByTimeAsync(100);

			const inputReqMsg = playerClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "input_request");
			expect(inputReqMsg).toBeDefined();
			expect(inputReqMsg.requestId).toBe("req-1");

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(100);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.advanceTimersByTimeAsync(100);

			const reconnInputReq = reconnClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "input_request");
			expect(reconnInputReq).toBeDefined();
			expect(reconnInputReq.requestId).toBe("req-1");
			expect(reconnInputReq.request.prompt).toBe("What is your answer?");
		});

		it("player who already responded does not receive duplicate input request", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Eve", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;

			hostClientWs.send(
				JSON.stringify({
					type: "input_request",
					requestId: "req-2",
					request: {
						prompt: "Choose a number",
						inputType: "number",
						timeLimit: 30,
					},
				}),
			);

			await vi.runAllTimersAsync();

			playerClientWs.send(
				JSON.stringify({
					type: "input_response",
					requestId: "req-2",
					response: { value: 42, timestamp: Date.now() },
				}),
			);

			await vi.runAllTimersAsync();

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(100);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const inputReqCount = reconnClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "input_request").length;
			expect(inputReqCount).toBe(0);
		});

		it("host reconnect maintains room state without reset", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Frank", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerId = tokenMsg.playerId;

			hostClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(100);

			playerClientWs.sent.length = 0;

			const reconnRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnHostWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const stateMsg = reconnHostWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "state_update");
			expect(stateMsg).toBeDefined();
			expect(stateMsg.state.phase).toBe("lobby");
			expect(stateMsg.state.players).toHaveLength(2);

			const playerInState = stateMsg.state.players.find(
				(p: { id: string }) => p.id === playerId,
			);
			expect(playerInState).toBeDefined();
		});

		it("host can continue controlling game after reconnect", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Player1", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			hostClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(100);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnHostWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();
			playerClientWs.sent.length = 0;

			reconnHostWs.send(
				JSON.stringify({
					type: "phase_change",
					phase: "playing",
				}),
			);

			await vi.runAllTimersAsync();

			const phaseMsg = playerClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "phase_change");
			expect(phaseMsg).toBeDefined();
			expect(phaseMsg.phase).toBe("playing");
		});

		it("player reconnects with same playerId", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Alice", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const originalPlayerId = tokenMsg.playerId;

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(30_000);

			hostClientWs.sent.length = 0;

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const reconnectMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_reconnect");
			expect(reconnectMsg).toBeDefined();
			expect(reconnectMsg.playerId).toBe(originalPlayerId);

			const stateMsg = JSON.parse(
				reconnClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			const player = stateMsg.state.players.find(
				(p: { id: string }) => p.id === originalPlayerId,
			);
			expect(player).toBeDefined();
			expect(player.connected).toBe(true);
		});

		it("player score is preserved after reconnect", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Bob", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const playerId = tokenMsg.playerId;

			await dobj.updatePlayerScore(playerId, 100);

			hostClientWs.sent.length = 0;

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(30_000);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const stateMsg = JSON.parse(
				reconnClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			const player = stateMsg.state.players.find(
				(p: { id: string }) => p.id === playerId,
			);
			expect(player).toBeDefined();
			expect(player.score).toBe(100);
		});

		it("player can submit response after reconnect during active input request", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Charlie", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;

			hostClientWs.send(
				JSON.stringify({
					type: "input_request",
					requestId: "req-submit-test",
					request: {
						prompt: "What is your answer?",
						inputType: "text",
						timeLimit: 60,
					},
				}),
			);

			await vi.advanceTimersByTimeAsync(100);

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(100);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.advanceTimersByTimeAsync(100);

			const inputReqMsg = reconnClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "input_request");
			expect(inputReqMsg).toBeDefined();
			expect(inputReqMsg.requestId).toBe("req-submit-test");

			hostClientWs.sent.length = 0;
			reconnClientWs.send(
				JSON.stringify({
					type: "input_response",
					requestId: "req-submit-test",
					response: { value: "my answer", timestamp: Date.now() },
				}),
			);

			await vi.runAllTimersAsync();

			const responseMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find(
					(m: { type: string; requestId?: string }) =>
						m.type === "input_response" && m.requestId === "req-submit-test",
				);
			expect(responseMsg).toBeDefined();
			expect(responseMsg.response.value).toBe("my answer");
		});

		it("invalid token creates new player instead of reconnect", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			await vi.runAllTimersAsync();
			hostClientWs.sent.length = 0;

			const reconnRes = await dobj.fetch(
				makeRequest(
					"GET",
					"/ws?role=player&token=invalid-token-xyz&name=NewPlayer",
					undefined,
					{
						Upgrade: "websocket",
					},
				),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const joinMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_joined");
			expect(joinMsg).toBeDefined();
			expect(joinMsg.player.name).toBe("NewPlayer");

			const stateMsg = JSON.parse(
				reconnClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			expect(stateMsg.state.players).toHaveLength(2);
		});

		it("reconnect after 60s window reuses playerId as new player", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=David", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const originalPlayerId = tokenMsg.playerId;

			playerClientWs.close(1000, "bye");
			hostClientWs.sent.length = 0;

			await vi.advanceTimersByTimeAsync(60_000);

			const leftMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_left");
			expect(leftMsg).toBeDefined();
			expect(leftMsg.playerId).toBe(originalPlayerId);

			hostClientWs.sent.length = 0;

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const joinMsg = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.find((m: { type: string }) => m.type === "player_joined");
			expect(joinMsg).toBeDefined();

			const stateMsg = JSON.parse(
				reconnClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			const player = stateMsg.state.players.find(
				(p: { id: string }) => p.id === originalPlayerId,
			);
			expect(player).toBeDefined();
			expect(player.connected).toBe(true);
		});

		it("multiple players disconnect and reconnect simultaneously", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const p1Res = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Player1", undefined, {
					Upgrade: "websocket",
				}),
			);
			const p1Ws = trackWebSocket((p1Res as any).webSocket);

			const p2Res = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=Player2", undefined, {
					Upgrade: "websocket",
				}),
			);
			const p2Ws = trackWebSocket((p2Res as any).webSocket);

			await vi.runAllTimersAsync();

			const p1Token = JSON.parse(
				p1Ws.sent.find((s) => s.includes("player_token"))!,
			).token;
			const p2Token = JSON.parse(
				p2Ws.sent.find((s) => s.includes("player_token"))!,
			).token;

			p1Ws.close(1000, "bye");
			p2Ws.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(30_000);

			hostClientWs.sent.length = 0;

			const p1ReconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${p1Token}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const p1ReconnWs = trackWebSocket((p1ReconnRes as any).webSocket);

			const p2ReconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${p2Token}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const p2ReconnWs = trackWebSocket((p2ReconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const reconnectMsgs = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "player_reconnect");
			expect(reconnectMsgs).toHaveLength(2);

			const leftMsgs = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "player_left");
			expect(leftMsgs).toHaveLength(0);
		});

		it("player reconnects multiple times in quick succession", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=MultiReconnect", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const originalPlayerId = tokenMsg.playerId;

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(10_000);

			let reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			let reconnWs = trackWebSocket((reconnRes as any).webSocket);
			await vi.runAllTimersAsync();

			reconnWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(10_000);

			reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			reconnWs = trackWebSocket((reconnRes as any).webSocket);
			await vi.runAllTimersAsync();

			reconnWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(10_000);

			reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			reconnWs = trackWebSocket((reconnRes as any).webSocket);
			await vi.runAllTimersAsync();

			const stateMsg = JSON.parse(
				reconnWs.sent.find((s) => s.includes("state_update"))!,
			);
			const player = stateMsg.state.players.find(
				(p: { id: string }) => p.id === originalPlayerId,
			);
			expect(player).toBeDefined();
			expect(player.connected).toBe(true);

			const leftMsgs = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "player_left");
			expect(leftMsgs).toHaveLength(0);
		});

		it("host and player both disconnect and reconnect", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			let hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=BothDisconnect", undefined, {
					Upgrade: "websocket",
				}),
			);
			let playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const playerId = tokenMsg.playerId;

			hostClientWs.close(1000, "bye");
			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(30_000);

			const hostReconnRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			hostClientWs = trackWebSocket((hostReconnRes as any).webSocket);

			const playerReconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			playerClientWs = trackWebSocket((playerReconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const hostStateMsg = JSON.parse(
				hostClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			expect(hostStateMsg.state.players).toHaveLength(2);

			const playerStateMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			const player = playerStateMsg.state.players.find(
				(p: { id: string }) => p.id === playerId,
			);
			expect(player).toBeDefined();
			expect(player.connected).toBe(true);

			const leftMsgs = hostClientWs.sent
				.map((s) => JSON.parse(s))
				.filter((m: { type: string }) => m.type === "player_left");
			expect(leftMsgs).toHaveLength(0);
		});

		it("no duplicate player seat on successful reconnect reclaim", async () => {
			await initRoom(dobj);

			const hostRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=host&token=token-abc", undefined, {
					Upgrade: "websocket",
				}),
			);
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			const playerRes = await dobj.fetch(
				makeRequest("GET", "/ws?role=player&name=NoDuplicate", undefined, {
					Upgrade: "websocket",
				}),
			);
			const playerClientWs = trackWebSocket((playerRes as any).webSocket);

			await vi.runAllTimersAsync();

			const tokenMsg = JSON.parse(
				playerClientWs.sent.find((s) => s.includes("player_token"))!,
			);
			const playerToken = tokenMsg.token;
			const originalPlayerId = tokenMsg.playerId;

			playerClientWs.close(1000, "bye");
			await vi.advanceTimersByTimeAsync(30_000);

			const reconnRes = await dobj.fetch(
				makeRequest("GET", `/ws?role=player&token=${playerToken}`, undefined, {
					Upgrade: "websocket",
				}),
			);
			const reconnClientWs = trackWebSocket((reconnRes as any).webSocket);

			await vi.runAllTimersAsync();

			const stateMsg = JSON.parse(
				reconnClientWs.sent.find((s) => s.includes("state_update"))!,
			);
			const playersWithOriginalId = stateMsg.state.players.filter(
				(p: { id: string }) => p.id === originalPlayerId,
			);
			expect(playersWithOriginalId).toHaveLength(1);

			const nonHostPlayers = stateMsg.state.players.filter(
				(p: { isHost?: boolean }) => !p.isHost,
			);
			expect(nonHostPlayers).toHaveLength(1);
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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

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
			const hostClientWs = trackWebSocket((hostRes as any).webSocket);

			await vi.runAllTimersAsync();

			await dobj.alarm();

			expect(hostClientWs.readyState).toBe(3); // CLOSED
			expect(mockState.state.storage.deleteAll).toHaveBeenCalled();
		});
	});
});
