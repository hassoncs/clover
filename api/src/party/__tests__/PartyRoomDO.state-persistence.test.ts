import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";
import {
	connectAudience,
	connectHost,
	connectPlayer,
	createMockState,
	extractPlayerCredentials,
	findMessage,
	findMessages,
	initRoom,
	makeRequest,
	parseSent,
	type TrackedWebSocket,
	trackWebSocket,
} from "./test-helpers";

describe("PartyRoomDO state persistence", () => {
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

	it("State round-trips through save/load (phase, players, sharedData, minPlayers, stateVersion)", async () => {
		await initRoom(dobj, "host-1", "token-abc", { minPlayers: 4 });
		const hostWs = await connectHost(dobj);
		const p1 = await connectPlayer(dobj, "Alice");
		const p2 = await connectPlayer(dobj, "Bob");
		await vi.runAllTimersAsync();

		const timerControl = {
			runAllTimersAsync: async () => {
				await vi.runAllTimersAsync();
			},
		};
		const p1Creds = await extractPlayerCredentials(p1.ws, timerControl);

		await dobj.updatePlayerScore(p1Creds.playerId, 11);
		await dobj.updateSharedData({ round: 2, category: "science" });
		await dobj.setPhase("playing");

		const persisted = mockState.storage.get("room") as {
			phase: string;
			stateVersion: number;
			minPlayers: number;
		};
		expect(persisted).toBeDefined();

		const restored = new PartyRoomDO(mockState.state);
		const notFound = await restored.fetch(makeRequest("GET", "/unknown"));
		expect(notFound.status).toBe(404);

		const restoredHostWs = await connectHost(restored);
		await vi.runAllTimersAsync();

		const updates = findMessages(restoredHostWs, "state_update");
		expect(updates.length).toBeGreaterThan(0);
		const latest = updates[updates.length - 1];
		const state = latest.state as {
			phase: string;
			stateVersion: number;
			players: Array<{ id: string; score?: number }>;
			sharedData: Record<string, unknown>;
		};

		expect(state.phase).toBe("playing");
		expect(state.stateVersion).toBe(persisted.stateVersion);
		expect(state.sharedData).toMatchObject({ round: 2, category: "science" });

		const restoredP1 = state.players.find((p) => p.id === p1Creds.playerId);
		expect(restoredP1?.score).toBe(11);

		const snapshotAfterLoad = mockState.storage.get("room") as {
			minPlayers: number;
		};
		expect(snapshotAfterLoad.minPlayers).toBe(4);

		const audienceWs = await connectAudience(restored, "Observer");
		await vi.runAllTimersAsync();
		expect(parseSent(audienceWs).some((m) => m.type === "state_update")).toBe(
			true,
		);

		hostWs.close();
		p2.ws.close();
	});

	it("stateVersion increments on mutating operations", async () => {
		await initRoom(dobj);
		const hostWs = await connectHost(dobj);
		const p1 = await connectPlayer(dobj, "VersionPlayer");
		await vi.runAllTimersAsync();

		const timerControl = {
			runAllTimersAsync: async () => {
				await vi.runAllTimersAsync();
			},
		};
		const p1Creds = await extractPlayerCredentials(p1.ws, timerControl);

		const afterJoin = mockState.storage.get("room") as { stateVersion: number };
		const versionAfterJoin = afterJoin.stateVersion;

		await dobj.updateSharedData({ question: 1 });
		const afterSharedData = mockState.storage.get("room") as {
			stateVersion: number;
		};
		expect(afterSharedData.stateVersion).toBeGreaterThan(versionAfterJoin);

		await dobj.updatePlayerScore(p1Creds.playerId, 5);
		const afterScore = mockState.storage.get("room") as {
			stateVersion: number;
		};
		expect(afterScore.stateVersion).toBeGreaterThan(
			afterSharedData.stateVersion,
		);

		await dobj.setPhase("playing");
		const afterPhase = mockState.storage.get("room") as {
			stateVersion: number;
		};
		expect(afterPhase.stateVersion).toBeGreaterThan(afterScore.stateVersion);

		const latestState = findMessages(hostWs, "state_update").slice(-1)[0]
			?.state as {
			stateVersion: number;
		};
		expect(latestState.stateVersion).toBeLessThanOrEqual(
			afterPhase.stateVersion,
		);
	});

	it("New DO instance loading saved state has correct phase and player list", async () => {
		await initRoom(dobj);
		await connectHost(dobj);
		const p1 = await connectPlayer(dobj, "Alice");
		const p2 = await connectPlayer(dobj, "Bob");
		await vi.runAllTimersAsync();

		await dobj.setPhase("playing");

		const restored = new PartyRoomDO(mockState.state);
		await restored.fetch(makeRequest("GET", "/unknown"));

		const restoredHostWs = await connectHost(restored);
		await vi.runAllTimersAsync();

		const latest = findMessages(restoredHostWs, "state_update").slice(-1)[0];
		expect(latest).toBeDefined();
		expect(latest.state.phase).toBe("playing");

		const players = latest.state.players as Array<{
			name: string;
			isHost?: boolean;
			connected: boolean;
		}>;
		expect(players).toHaveLength(3);

		const host = players.find((p) => p.isHost);
		expect(host?.connected).toBe(true);

		const nonHostPlayers = players.filter((p) => !p.isHost);
		expect(nonHostPlayers.every((p) => p.connected === false)).toBe(true);

		p1.ws.close();
		p2.ws.close();
	});

	it("Cleanup via alarm clears storage and closes all sockets", async () => {
		await initRoom(dobj);
		const hostWs = await connectHost(dobj);
		const p1 = await connectPlayer(dobj, "AlarmPlayer");
		await vi.runAllTimersAsync();

		expect(hostWs.readyState).toBe(WebSocket.OPEN);
		expect(p1.ws.readyState).toBe(WebSocket.OPEN);

		await dobj.alarm();
		await vi.runAllTimersAsync();

		expect(mockState.state.storage.deleteAll).toHaveBeenCalledTimes(1);
		expect(mockState.storage.size).toBe(0);
		expect(hostWs.readyState).not.toBe(WebSocket.OPEN);
		expect(p1.ws.readyState).not.toBe(WebSocket.OPEN);

		const orphanState = createMockState();
		const orphan = new PartyRoomDO(orphanState.state);
		const req = makeRequest("GET", "/unknown");
		expect((await orphan.fetch(req)).status).toBe(404);

		const maybeStateUpdate = findMessage(hostWs, "state_update");
		expect(maybeStateUpdate).toBeDefined();
	});
});
