import { describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";
import { createMockState } from "./test-helpers";

function createSocket() {
	return {
		readyState: WebSocket.OPEN,
		accept: vi.fn<() => void>(),
		send: vi.fn<(message: string) => void>(),
	} as unknown as WebSocket;
}

describe("PartyRoomDO.sendToPlayer", () => {
	it("sends private_state only to targeted player", async () => {
		const mockState = createMockState();
		const room = new PartyRoomDO(mockState.state);
		const targetSocket = createSocket();
		const otherPlayerSocket = createSocket();
		const hostSocket = createSocket();

		(mockState.state as any).acceptWebSocket(targetSocket);
		(mockState.state as any).acceptWebSocket(otherPlayerSocket);
		(mockState.state as any).acceptWebSocket(hostSocket);

		(targetSocket as any).serializeAttachment({
			role: "player",
			playerId: "p1",
		});
		(otherPlayerSocket as any).serializeAttachment({
			role: "player",
			playerId: "p2",
		});
		(hostSocket as any).serializeAttachment({ role: "host" });

		await room.sendToPlayer("p1", { secret: "value", scoreDelta: 5 });

		expect(
			(targetSocket.send as ReturnType<typeof vi.fn>).mock.calls,
		).toHaveLength(1);
		expect(
			JSON.parse(
				(targetSocket.send as ReturnType<typeof vi.fn>).mock.calls[0][0],
			),
		).toEqual({
			type: "private_state",
			data: { secret: "value", scoreDelta: 5 },
		});
		expect(
			(otherPlayerSocket.send as ReturnType<typeof vi.fn>).mock.calls,
		).toHaveLength(0);
		expect(
			(hostSocket.send as ReturnType<typeof vi.fn>).mock.calls,
		).toHaveLength(0);
	});

	it("gracefully no-ops when player is not connected", async () => {
		const mockState = createMockState();
		const room = new PartyRoomDO(mockState.state);
		const connectedSocket = createSocket();

		(mockState.state as any).acceptWebSocket(connectedSocket);
		(connectedSocket as any).serializeAttachment({
			role: "player",
			playerId: "p1",
		});

		await expect(
			room.sendToPlayer("missing-player", { hidden: true }),
		).resolves.toBeUndefined();
		expect(
			(connectedSocket.send as ReturnType<typeof vi.fn>).mock.calls,
		).toHaveLength(0);
	});
});
