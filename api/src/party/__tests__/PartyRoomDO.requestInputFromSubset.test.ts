import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";
import { createMockState } from "./test-helpers";

function createSocket() {
	return {
		readyState: WebSocket.OPEN,
		accept: vi.fn<() => void>(),
		send: vi.fn<(message: string) => void>(),
	} as unknown as WebSocket;
}

describe("PartyRoomDO.requestInputFromSubset", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("sends input_request only to targeted players and resolves when all targeted responses arrive", async () => {
		const mockState = createMockState();
		const room = new PartyRoomDO(mockState.state);
		const p1Socket = createSocket();
		const p2Socket = createSocket();
		const p3Socket = createSocket();
		const hostSocket = createSocket();

		(mockState.state as any).acceptWebSocket(p1Socket);
		(mockState.state as any).acceptWebSocket(p2Socket);
		(mockState.state as any).acceptWebSocket(p3Socket);
		(mockState.state as any).acceptWebSocket(hostSocket);

		(p1Socket as any).serializeAttachment({
			role: "player",
			playerId: "p1",
		});
		(p2Socket as any).serializeAttachment({
			role: "player",
			playerId: "p2",
		});
		(p3Socket as any).serializeAttachment({
			role: "player",
			playerId: "p3",
		});
		(hostSocket as any).serializeAttachment({ role: "host" });

		(room as any).players.set("p1", { id: "p1", name: "P1", connected: true });
		(room as any).players.set("p2", { id: "p2", name: "P2", connected: true });
		(room as any).players.set("p3", { id: "p3", name: "P3", connected: true });

		const responsesPromise = room.requestInputFromSubset(
			"req-1",
			{ type: "text", prompt: "Prompt", timeLimit: 5 },
			["p1", "p3"],
		);

		expect((p1Socket.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
			1,
		);
		expect((p2Socket.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
			0,
		);
		expect((p3Socket.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
			1,
		);
		expect(
			JSON.parse((p1Socket.send as ReturnType<typeof vi.fn>).mock.calls[0][0]),
		).toMatchObject({
			type: "input_request",
			requestId: "req-1",
			request: { type: "text", prompt: "Prompt", timeLimit: 5 },
		});

		await room.handleMessage(
			p1Socket,
			JSON.stringify({
				type: "input_response",
				requestId: "req-1",
				response: { playerId: "p1", value: "a", timestamp: 1 },
			}),
		);
		await room.handleMessage(
			p3Socket,
			JSON.stringify({
				type: "input_response",
				requestId: "req-1",
				response: { playerId: "p3", value: "b", timestamp: 2 },
			}),
		);

		const responses = await responsesPromise;
		expect(Array.from(responses.keys()).sort()).toEqual(["p1", "p3"]);
		expect(responses.get("p1")?.value).toBe("a");
		expect(responses.get("p3")?.value).toBe("b");
	});

	it("returns partial responses on timeout and ignores non-targeted player responses", async () => {
		const mockState = createMockState();
		const room = new PartyRoomDO(mockState.state);
		const p1Socket = createSocket();
		const p2Socket = createSocket();

		(mockState.state as any).acceptWebSocket(p1Socket);
		(mockState.state as any).acceptWebSocket(p2Socket);

		(p1Socket as any).serializeAttachment({
			role: "player",
			playerId: "p1",
		});
		(p2Socket as any).serializeAttachment({
			role: "player",
			playerId: "p2",
		});

		(room as any).players.set("p1", { id: "p1", name: "P1", connected: true });
		(room as any).players.set("p2", { id: "p2", name: "P2", connected: true });

		const responsesPromise = room.requestInputFromSubset(
			"req-2",
			{ type: "text", prompt: "Prompt", timeLimit: 1 },
			["p1", "p3"],
		);

		await room.handleMessage(
			p2Socket,
			JSON.stringify({
				type: "input_response",
				requestId: "req-2",
				response: { playerId: "p2", value: "nope", timestamp: 1 },
			}),
		);
		await room.handleMessage(
			p1Socket,
			JSON.stringify({
				type: "input_response",
				requestId: "req-2",
				response: { playerId: "p1", value: "yes", timestamp: 2 },
			}),
		);

		let settled = false;
		responsesPromise.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(1000);
		const responses = await responsesPromise;

		expect(Array.from(responses.keys())).toEqual(["p1"]);
		expect(responses.get("p1")?.value).toBe("yes");
		expect(responses.has("p2")).toBe(false);
	});

	it("resolves immediately with empty map when subset is empty", async () => {
		const mockState = createMockState();
		const room = new PartyRoomDO(mockState.state);
		const p1Socket = createSocket();

		(mockState.state as any).acceptWebSocket(p1Socket);
		(p1Socket as any).serializeAttachment({
			role: "player",
			playerId: "p1",
		});

		(room as any).players.set("p1", { id: "p1", name: "P1", connected: true });

		const responses = await room.requestInputFromSubset(
			"req-3",
			{ type: "text", prompt: "Prompt", timeLimit: 1 },
			[],
		);

		expect(responses.size).toBe(0);
		expect((p1Socket.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
			0,
		);
	});
});
