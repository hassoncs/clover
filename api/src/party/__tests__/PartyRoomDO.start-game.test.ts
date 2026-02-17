import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartyRoomDO } from "../PartyRoomDO";
import { QuickJSServerRunner } from "../QuickJSServerRunner";
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

describe("PartyRoomDO start game with scripts", () => {
	let dobj: PartyRoomDO;

	beforeEach(() => {
		vi.useFakeTimers();
		const { state } = createMockState();
		dobj = new PartyRoomDO(state);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	async function connectEnoughPlayers(room: PartyRoomDO): Promise<{
		hostWs: TrackedWebSocket;
		players: TrackedWebSocket[];
	}> {
		const hostWs = await connectHost(room);
		const p1 = await connectPlayer(room, "Player 1");
		const p2 = await connectPlayer(room, "Player 2");
		const p3 = await connectPlayer(room, "Player 3");
		await vi.runAllTimersAsync();
		return { hostWs, players: [p1.ws, p2.ws, p3.ws] };
	}

	it("start_game with serverScriptCode invokes QuickJSServerRunner", async () => {
		const executeSpy = vi
			.spyOn(QuickJSServerRunner.prototype, "execute")
			.mockResolvedValue(undefined);

		await initRoom(dobj, "host-1", "token-abc", {
			serverScriptCode:
				"exports.run = async function(room) { await room.setPhase('playing'); };",
			minPlayers: 3,
		});

		const { hostWs } = await connectEnoughPlayers(dobj);
		hostWs.send(JSON.stringify({ type: "start_game" }));
		await vi.runAllTimersAsync();

		expect(executeSpy).toHaveBeenCalledTimes(1);
		const [scriptCode, scriptConfig] = executeSpy.mock.calls[0];
		expect(scriptCode).toContain("exports.run");
		expect(scriptConfig).toEqual({});

		const audienceWs = await connectAudience(dobj, "Spectator");
		await vi.runAllTimersAsync();
		expect(parseSent(audienceWs).some((m) => m.type === "state_update")).toBe(
			true,
		);
	});

	it("Script failure emits SCRIPT_ERROR, writes sharedData.scriptError, sets phase ended", async () => {
		await initRoom(dobj, "host-1", "token-abc", {
			serverScriptCode:
				"exports.run = async function() { throw new Error('kaboom'); };",
			minPlayers: 3,
		});

		const { hostWs } = await connectEnoughPlayers(dobj);
		hostWs.send(JSON.stringify({ type: "start_game" }));
		await vi.runAllTimersAsync();

		const errors = findMessages(hostWs, "error");
		const scriptError = errors.find((m) => m.code === "SCRIPT_ERROR");
		expect(scriptError).toBeDefined();
		expect(typeof scriptError?.message).toBe("string");
		expect(String(scriptError?.message).length).toBeGreaterThan(0);

		const updates = findMessages(hostWs, "state_update");
		const latestState = updates[updates.length - 1]?.state as {
			sharedData: { scriptError?: string };
		};
		expect(typeof latestState.sharedData.scriptError).toBe("string");
		expect((latestState.sharedData.scriptError ?? "").length).toBeGreaterThan(
			0,
		);

		const phaseChange = findMessages(hostWs, "phase_change").find(
			(m) => m.phase === "ended",
		);
		expect(phaseChange).toBeDefined();
	});

	it("Host disconnect during playing phase keeps room state recoverable for reconnect window", async () => {
		await initRoom(dobj, "host-1", "token-abc", {
			serverScriptCode:
				"exports.run = async function(room) { await room.setPhase('playing'); };",
			minPlayers: 3,
		});

		const { hostWs, players } = await connectEnoughPlayers(dobj);
		hostWs.send(JSON.stringify({ type: "start_game" }));
		await vi.runAllTimersAsync();

		const playingPhase = findMessages(hostWs, "phase_change").find(
			(m) => m.phase === "playing",
		);
		expect(playingPhase).toBeDefined();

		hostWs.close(1000, "host temp disconnect");
		await vi.advanceTimersByTimeAsync(30_000);

		const reconnectedHost = await connectHost(dobj);
		await vi.runAllTimersAsync();

		const reconnectState = findMessages(reconnectedHost, "state_update").slice(
			-1,
		)[0].state as {
			phase: string;
			players: Array<{ connected: boolean; isHost?: boolean }>;
		};
		expect(reconnectState.phase).toBe("playing");
		expect(reconnectState.players).toHaveLength(4);
		expect(
			reconnectState.players.some((p) => p.isHost && p.connected === true),
		).toBe(true);

		for (const ws of players) {
			ws.close();
		}
	});

	it("Host state_update is blocked when serverScriptCode is set (Y1 fix)", async () => {
		await initRoom(dobj, "host-1", "token-abc", {
			serverScriptCode:
				"exports.run = async function(room) { await room.setPhase('playing'); };",
			minPlayers: 3,
		});

		const { hostWs } = await connectEnoughPlayers(dobj);
		hostWs.sent.length = 0;

		hostWs.send(
			JSON.stringify({
				type: "state_update",
				state: { sharedData: { hacked: true } },
			}),
		);
		await vi.runAllTimersAsync();

		const scriptActiveError = findMessages(hostWs, "error").find(
			(m) => m.code === "SCRIPT_ACTIVE",
		);
		expect(scriptActiveError).toBeDefined();

		expect((dobj as any).sharedData).toEqual({});

		const hostStateUpdate = findMessage(hostWs, "state_update");
		expect(hostStateUpdate).toBeUndefined();

		const tokenProbe = await connectPlayer(dobj, "TokenProbe");
		await vi.runAllTimersAsync();
		const timerControl = {
			runAllTimersAsync: async () => {
				await vi.runAllTimersAsync();
			},
		};
		const creds = await extractPlayerCredentials(tokenProbe.ws, timerControl);
		expect(creds.playerId.length).toBeGreaterThan(0);

		const req = makeRequest("GET", "/unknown");
		expect(req.url).toContain("/unknown");
	});
});
