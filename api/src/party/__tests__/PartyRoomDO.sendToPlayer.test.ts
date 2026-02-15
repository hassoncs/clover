import { describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";

type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

function createMockState(): DurableObjectState {
	return {
		storage: {
			get: vi.fn(async () => undefined),
			put: vi.fn(async () => undefined),
			delete: vi.fn(async () => undefined),
			deleteAll: vi.fn(async () => undefined),
			setAlarm: vi.fn(async () => undefined),
		} as unknown as DurableObjectState["storage"],
	} as DurableObjectState;
}

function createSocket() {
	return {
		readyState: WebSocket.OPEN,
		send: vi.fn<(message: string) => void>(),
	} as unknown as WebSocket;
}

describe("PartyRoomDO.sendToPlayer", () => {
	it("sends private_state only to targeted player", async () => {
		const room = new PartyRoomDO(createMockState());
		const targetSocket = createSocket();
		const otherPlayerSocket = createSocket();
		const hostSocket = createSocket();

		(room as any).sockets.add(targetSocket);
		(room as any).sockets.add(otherPlayerSocket);
		(room as any).sockets.add(hostSocket);

		(room as any).socketMetadata.set(targetSocket, {
			role: "player",
			playerId: "p1",
		});
		(room as any).socketMetadata.set(otherPlayerSocket, {
			role: "player",
			playerId: "p2",
		});
		(room as any).socketMetadata.set(hostSocket, { role: "host" });

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
		const room = new PartyRoomDO(createMockState());
		const connectedSocket = createSocket();

		(room as any).sockets.add(connectedSocket);
		(room as any).socketMetadata.set(connectedSocket, {
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
