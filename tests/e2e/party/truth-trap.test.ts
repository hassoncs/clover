import { afterEach, describe, expect, it } from "vitest";

import {
	delay,
	sendInputResponse,
	setupGameRoom,
	startGameAndReady,
	waitForMessage,
	waitForMessageFrom,
} from "./helpers";

const DEFAULT_ROUND_COUNT = 3;
const PLAYER_NAMES = ["Alice", "Bob", "Charlie"];

function isScoreEntry(
	value: unknown,
): value is { id: string; name: string; score: number } {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.name === "string" &&
		typeof candidate.score === "number"
	);
}

let cleanup: (() => void) | null = null;

afterEach(() => {
	cleanup?.();
	cleanup = null;
});

describe("Truth Trap E2E", () => {
	it("runs full game flow and ends with winner", async () => {
		const setup = await setupGameRoom("truth-trap", PLAYER_NAMES, 3);
		cleanup = setup.cleanup;

		const { host, players } = setup;

		await startGameAndReady(host, players);

		let winnerWaitStart = host.messages.length;

		for (let round = 1; round <= DEFAULT_ROUND_COUNT; round++) {
			const liesRequestStarts = players.map((player) => ({
				player,
				fromIndex: player.conn.messages.length,
			}));

			const writingWaitStart = host.messages.length;
			const writingPhase =
				round === 1
					? await waitForMessage(
							host.messages,
							(msg) =>
								msg.type === "state_update" &&
								msg.state?.sharedData?.phase === "writing_lies" &&
								msg.state?.sharedData?.round === round,
							45_000,
						)
					: await waitForMessageFrom(
							host.messages,
							writingWaitStart,
							(msg) =>
								msg.type === "state_update" &&
								msg.state?.sharedData?.phase === "writing_lies" &&
								msg.state?.sharedData?.round === round,
							45_000,
						);

			expect(writingPhase.state?.sharedData?.prompt).toBeTruthy();
			expect(writingPhase.state?.sharedData?.multiplier).toBeTruthy();

			for (const { player, fromIndex } of liesRequestStarts) {
				const liesRequest = await waitForMessageFrom(
					player.conn.messages,
					fromIndex,
					(msg) => msg.type === "input_request" && msg.requestId === "lies",
					45_000,
				);
				expect(liesRequest.request?.type).toBe("text");
				sendInputResponse(
					player.conn.ws,
					"lies",
					`${player.name} lie round ${round}`,
					player.name,
				);
			}

			const voteRequestStarts = players.map((player) => ({
				player,
				fromIndex: player.conn.messages.length,
			}));

			const votingWaitStart = host.messages.length;
			const votingPhase = await waitForMessageFrom(
				host.messages,
				votingWaitStart,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "voting",
				45_000,
			);

			const answers = votingPhase.state?.sharedData?.answers;
			expect(Array.isArray(answers)).toBe(true);
			expect((answers as unknown[]).length).toBeGreaterThanOrEqual(4);

			for (const { player, fromIndex } of voteRequestStarts) {
				const voteRequest = await waitForMessageFrom(
					player.conn.messages,
					fromIndex,
					(msg) => msg.type === "input_request" && msg.requestId === "votes",
					45_000,
				);
				expect(voteRequest.request?.type).toBe("choice");
				sendInputResponse(player.conn.ws, "votes", 0, player.name);
			}

			const revealWaitStart = host.messages.length;
			const revealPhase = await waitForMessageFrom(
				host.messages,
				revealWaitStart,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "reveal",
				45_000,
			);
			expect(revealPhase.state?.sharedData?.results).toBeTruthy();

			const scoresWaitStart = host.messages.length;
			const scoresPhase = await waitForMessageFrom(
				host.messages,
				scoresWaitStart,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores",
				45_000,
			);

			const scoreboard = scoresPhase.state?.sharedData?.scoreboard;
			expect(Array.isArray(scoreboard)).toBe(true);
			expect((scoreboard as unknown[]).length).toBe(PLAYER_NAMES.length);

			winnerWaitStart = host.messages.length;
			await delay(50);
		}

		const winnerPhase = await waitForMessageFrom(
			host.messages,
			winnerWaitStart,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "winner",
			45_000,
		);

		const winner = winnerPhase.state?.sharedData?.winner;
		const scoreboard = winnerPhase.state?.sharedData?.scoreboard;

		expect(isScoreEntry(winner)).toBe(true);
		expect(Array.isArray(scoreboard)).toBe(true);

		const finalScoreboard = Array.isArray(scoreboard)
			? scoreboard.filter(isScoreEntry)
			: [];

		expect(finalScoreboard.length).toBe(PLAYER_NAMES.length);
		expect(finalScoreboard[0]).toBeDefined();
		expect(isScoreEntry(finalScoreboard[0])).toBe(true);

		if (isScoreEntry(winner)) {
			expect(finalScoreboard.map((entry) => entry.id)).toContain(winner.id);
			expect(finalScoreboard[0].name).toBe(winner.name);
		}
	}, 240_000);
});
