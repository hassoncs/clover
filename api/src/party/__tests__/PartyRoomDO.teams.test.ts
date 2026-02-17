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

describe("PartyRoomDO teams", () => {
	let dobj: PartyRoomDO;

	beforeEach(() => {
		vi.useFakeTimers();
		const { state } = createMockState();
		dobj = new PartyRoomDO(state);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function setupRoomWithParticipants(): Promise<{
		hostWs: TrackedWebSocket;
		players: Array<{ ws: TrackedWebSocket; playerId: string }>;
		audienceWs: TrackedWebSocket;
	}> {
		await initRoom(dobj, "host-1", "token-abc", { minPlayers: 2 });

		const hostWs = await connectHost(dobj);
		const p1 = await connectPlayer(dobj, "Alice");
		const p2 = await connectPlayer(dobj, "Bob");
		const p3 = await connectPlayer(dobj, "Carol");
		const p4 = await connectPlayer(dobj, "Dave");
		const audienceWs = await connectAudience(dobj, "Viewer");

		await vi.runAllTimersAsync();

		const timerControl = {
			runAllTimersAsync: async () => {
				await vi.runAllTimersAsync();
			},
		};
		const p1Creds = await extractPlayerCredentials(p1.ws, timerControl);
		const p2Creds = await extractPlayerCredentials(p2.ws, timerControl);
		const p3Creds = await extractPlayerCredentials(p3.ws, timerControl);
		const p4Creds = await extractPlayerCredentials(p4.ws, timerControl);

		return {
			hostWs,
			players: [
				{ ws: p1.ws, playerId: p1Creds.playerId },
				{ ws: p2.ws, playerId: p2Creds.playerId },
				{ ws: p3.ws, playerId: p3Creds.playerId },
				{ ws: p4.ws, playerId: p4Creds.playerId },
			],
			audienceWs,
		};
	}

	it("assignTeams(random) assigns only non-host, non-audience players", async () => {
		const { hostWs } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const updates = findMessages(hostWs, "state_update");
		expect(updates.length).toBeGreaterThan(0);
		const latest = updates[updates.length - 1];
		const players = latest.state.players as Array<{
			isHost?: boolean;
			role?: string;
			team?: string;
		}>;

		const host = players.find((p) => p.isHost);
		expect(host?.team).toBeUndefined();

		const audience = players.find((p) => p.role === "audience");
		expect(audience?.team).toBeUndefined();

		const assignable = players.filter(
			(p) => !p.isHost && p.role !== "audience",
		);
		expect(assignable).toHaveLength(4);
		for (const player of assignable) {
			expect(player.team).toMatch(/^Team [12]$/);
		}
	});

	it("assignTeams distributes players across teams via modulo", async () => {
		const { hostWs } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const allUpdates = findMessages(hostWs, "state_update");
		const latest = allUpdates[allUpdates.length - 1];
		expect(latest).toBeDefined();
		const players = (
			latest?.state.players as Array<{ role?: string; team?: string }>
		).filter((p) => p.role !== "audience" && p.role !== undefined);

		const teamCounts = players.reduce(
			(acc, p) => {
				if (p.team) {
					acc[p.team] = (acc[p.team] ?? 0) + 1;
				}
				return acc;
			},
			{} as Record<string, number>,
		);

		expect(teamCounts["Team 1"] + teamCounts["Team 2"]).toBe(4);
		expect(
			Math.abs(teamCounts["Team 1"] - teamCounts["Team 2"]),
		).toBeLessThanOrEqual(1);
	});

	it("assignTeams broadcasts updated state with team assignments", async () => {
		const { hostWs } = await setupRoomWithParticipants();

		const updatesBefore = findMessages(hostWs, "state_update").length;
		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const updatesAfter = findMessages(hostWs, "state_update");
		expect(updatesAfter.length).toBeGreaterThan(updatesBefore);

		const latest = updatesAfter[updatesAfter.length - 1];
		const assigned = (
			latest.state.players as Array<{
				isHost?: boolean;
				role?: string;
				team?: string;
			}>
		).filter((p) => !p.isHost && p.role !== "audience");
		expect(assigned.every((p) => typeof p.team === "string")).toBe(true);
	});

	it("updateTeamScore updates score for players in target team only", async () => {
		const { hostWs } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const updates = findMessages(hostWs, "state_update");
		const latest = updates[updates.length - 1];
		const teamOnePlayer = (
			latest?.state.players as Array<{ id: string; team?: string }>
		).find((p) => p.team === "Team 1");
		expect(teamOnePlayer).toBeDefined();

		await dobj.updateTeamScore("Team 1", 7);
		await vi.runAllTimersAsync();

		const updatesAfterScore = findMessages(hostWs, "state_update");
		const afterScoreUpdate = updatesAfterScore[updatesAfterScore.length - 1];
		const players = afterScoreUpdate?.state.players as Array<{
			id: string;
			team?: string;
			score?: number;
		}>;

		for (const player of players) {
			if (player.team === "Team 1") {
				expect(player.score).toBe(7);
			}
			if (player.team === "Team 2") {
				expect(player.score ?? 0).toBe(0);
			}
		}
	});

	it("updateTeamScore broadcasts state after update", async () => {
		const { hostWs } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const beforeCount = findMessages(hostWs, "state_update").length;
		await dobj.updateTeamScore("Team 2", 3);
		await vi.runAllTimersAsync();

		const afterMessages = findMessages(hostWs, "state_update");
		expect(afterMessages.length).toBeGreaterThan(beforeCount);
		const latest = afterMessages[afterMessages.length - 1];
		const teamTwoPlayers = (
			latest.state.players as Array<{ team?: string; score?: number }>
		).filter((p) => p.team === "Team 2");
		expect(teamTwoPlayers.every((p) => p.score === 3)).toBe(true);
	});

	it("broadcastToTeam sends only to connected sockets in that team", async () => {
		const { players } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const teamOne = dobj.getTeamPlayers("Team 1");
		expect(teamOne.length).toBeGreaterThan(0);

		const wsByPlayerId = new Map(players.map((p) => [p.playerId, p.ws]));
		const connectedTarget = wsByPlayerId.get(teamOne[0].id);
		expect(connectedTarget).toBeDefined();

		let disconnectedTeammate: TrackedWebSocket | undefined;
		if (teamOne.length > 1) {
			disconnectedTeammate = wsByPlayerId.get(teamOne[1].id);
			disconnectedTeammate?.close(1000, "disconnect teammate");
			await vi.runAllTimersAsync();
		}

		for (const { ws } of players) {
			ws.sent.length = 0;
		}

		dobj.broadcastToTeam("Team 1", JSON.stringify({ type: "team_ping" }));
		await vi.runAllTimersAsync();

		expect(connectedTarget?.sent).toContain(
			JSON.stringify({ type: "team_ping" }),
		);
		if (disconnectedTeammate) {
			expect(disconnectedTeammate.sent).not.toContain(
				JSON.stringify({ type: "team_ping" }),
			);
		}

		const teamTwoPlayers = dobj.getTeamPlayers("Team 2");
		for (const player of teamTwoPlayers) {
			const ws = wsByPlayerId.get(player.id);
			expect(ws?.sent).not.toContain(JSON.stringify({ type: "team_ping" }));
		}
	});

	it("getTeamPlayers returns correct membership", async () => {
		const { hostWs, audienceWs } = await setupRoomWithParticipants();

		await dobj.assignTeams(2, "random");
		await vi.runAllTimersAsync();

		const teamOnePlayers = dobj.getTeamPlayers("Team 1");
		const teamTwoPlayers = dobj.getTeamPlayers("Team 2");
		const allByApi = new Set(
			[...teamOnePlayers, ...teamTwoPlayers].map((p) => p.id),
		);

		const updates = findMessages(hostWs, "state_update");
		const latest = updates[updates.length - 1];
		const stateTeamPlayers = (
			latest?.state.players as Array<{
				id: string;
				isHost?: boolean;
				role?: string;
				team?: string;
			}>
		)
			.filter((p) => !p.isHost && p.role !== "audience" && p.team)
			.map((p) => p.id);

		expect(allByApi).toEqual(new Set(stateTeamPlayers));

		const hostStateMessage = findMessage(hostWs, "state_update");
		expect(hostStateMessage).toBeDefined();

		const parsedAudience = parseSent(audienceWs);
		expect(parsedAudience.some((m) => m.type === "state_update")).toBe(true);
	});
});
