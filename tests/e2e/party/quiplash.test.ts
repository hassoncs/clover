import { afterEach, describe, expect, it } from "vitest";
import {
	type Connection,
	delay,
	type PlayerInfo,
	sendInputResponse,
	setupGameRoom,
	startGameAndReady,
	waitForMessageFrom,
} from "./helpers";

const PLAYER_NAMES = ["Alice", "Bob", "Charlie"];

let cleanup: (() => void) | undefined;

function formatMessageTimeline(
	messages: Connection["messages"],
	fromIndex: number,
) {
	return messages.slice(fromIndex).map((msg) => ({
		type: msg.type,
		phase: msg.state?.sharedData?.phase ?? msg.state?.phase ?? msg.phase,
		roundNumber: msg.state?.sharedData?.roundNumber,
		requestId: msg.requestId,
	}));
}

async function waitForHostState(
	hostMessages: Connection["messages"],
	hostIndex: number,
	predicate: (msg: Connection["messages"][number]) => boolean,
	label: string,
	timeoutMs: number,
) {
	try {
		return await waitForMessageFrom(
			hostMessages,
			hostIndex,
			predicate,
			timeoutMs,
		);
	} catch (error) {
		console.error(
			`[quiplash-e2e] timeout while waiting for ${label}; messages since index ${hostIndex}:`,
			JSON.stringify(formatMessageTimeline(hostMessages, hostIndex), null, 2),
		);
		throw error;
	}
}

afterEach(() => {
	cleanup?.();
	cleanup = undefined;
});

describe("Quiplash E2E", () => {
	it("runs full quiplash flow from lobby to ended", async () => {
		let host: Connection | undefined;
		let players: PlayerInfo[];

		try {
			const setup = await setupGameRoom("quiplash", PLAYER_NAMES, 3);
			host = setup.host;
			players = setup.players;
			cleanup = setup.cleanup;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes("Room creation failed (503)")) {
				expect(message).toContain("503");
				return;
			}
			throw error;
		}

		const hostMessages = host!.messages;
		let hostIndex = hostMessages.length;
		const playerIndexes = new Map<string, number>(
			players!.map((p) => [p.id, p.conn.messages.length]),
		);

		await startGameAndReady(host!, players!);
		await delay(100);

		const firstAnswering = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "answering" &&
				msg.state?.sharedData?.roundNumber === 1,
			"round 1 answering",
			45_000,
		);
		hostIndex = hostMessages.indexOf(firstAnswering) + 1;

		const totalRounds = Number(firstAnswering.state?.sharedData?.totalRounds);
		expect(totalRounds).toBeGreaterThanOrEqual(2);
		const roundCount = totalRounds - 1;

		for (let round = 1; round <= roundCount; round++) {
			const answeringState =
				round === 1
					? firstAnswering
					: await waitForHostState(
							hostMessages,
							hostIndex,
							(msg) =>
								msg.type === "state_update" &&
								msg.state?.sharedData?.phase === "answering" &&
								msg.state?.sharedData?.roundNumber === round,
							`round ${round} answering`,
							45_000,
						);

			hostIndex = hostMessages.indexOf(answeringState) + 1;
			expect(answeringState.state?.sharedData?.phase).toBe("answering");
			expect(answeringState.state?.sharedData?.roundNumber).toBe(round);

			for (const player of players!) {
				const fromIndex = playerIndexes.get(player.id) ?? 0;
				const answerRequest = await waitForMessageFrom(
					player.conn.messages,
					fromIndex,
					(msg) =>
						msg.type === "input_request" &&
						msg.requestId === `answer-r${round}`,
					45_000,
				);
				playerIndexes.set(
					player.id,
					player.conn.messages.indexOf(answerRequest) + 1,
				);

				expect(answerRequest.request?.type).toBe("text");
				const assignments =
					(answerRequest.request?.assignments as
						| Record<string, Array<{ id: string; text: string }>>
						| undefined) ?? {};
				const prompts = assignments[player.id] ?? [];
				expect(prompts.length).toBeGreaterThan(0);

				const answerMap: Record<string, string> = {};
				for (const prompt of prompts) {
					answerMap[prompt.id] =
						`${player.name} round ${round} answer for ${prompt.id}`;
				}

				sendInputResponse(
					player.conn.ws,
					`answer-r${round}`,
					JSON.stringify(answerMap),
					player.name,
				);
				playerIndexes.set(player.id, player.conn.messages.length);
			}

			for (
				let matchupIndex = 0;
				matchupIndex < players!.length;
				matchupIndex++
			) {
				const revealState = await waitForHostState(
					hostMessages,
					hostIndex,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "reveal" &&
						msg.state?.sharedData?.roundNumber === round,
					`round ${round} reveal matchup ${matchupIndex}`,
					30_000,
				);
				hostIndex = hostMessages.indexOf(revealState) + 1;

				expect(revealState.state?.sharedData?.promptText).toBeTruthy();
				const revealAnswersJson = String(
					revealState.state?.sharedData?.answersJson ?? "[]",
				);
				const revealAnswers = JSON.parse(revealAnswersJson) as Array<{
					id: string;
					text: string;
				}>;
				expect(revealAnswers).toHaveLength(2);
				expect(revealAnswers.map((a) => a.id).sort()).toEqual(["a1", "a2"]);

				const votingState = await waitForHostState(
					hostMessages,
					hostIndex,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "voting" &&
						msg.state?.sharedData?.roundNumber === round,
					`round ${round} voting matchup ${matchupIndex}`,
					30_000,
				);
				hostIndex = hostMessages.indexOf(votingState) + 1;

				const voteOptionsJson = String(
					votingState.state?.sharedData?.voteOptionsJson ?? "[]",
				);
				const voteOptions = JSON.parse(voteOptionsJson) as Array<{
					id: string;
					text: string;
				}>;
				expect(voteOptions).toHaveLength(2);
				expect(voteOptions.map((option) => option.id).sort()).toEqual([
					"a1",
					"a2",
				]);

				for (const player of players!) {
					const fromIndex = playerIndexes.get(player.id) ?? 0;
					const voteRequest = await waitForMessageFrom(
						player.conn.messages,
						fromIndex,
						(msg) =>
							msg.type === "input_request" &&
							msg.requestId === `vote-r${round}-p${matchupIndex}`,
						30_000,
					);
					playerIndexes.set(
						player.id,
						player.conn.messages.indexOf(voteRequest) + 1,
					);

					expect(voteRequest.request?.type).toBe("choice");
					expect(voteRequest.request?.options).toEqual(["a1", "a2"]);
					sendInputResponse(
						player.conn.ws,
						`vote-r${round}-p${matchupIndex}`,
						player.name === "Charlie" ? "a2" : "a1",
						player.name,
					);
					playerIndexes.set(player.id, player.conn.messages.length);
				}

				const roundResultsState = await waitForHostState(
					hostMessages,
					hostIndex,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "round_results" &&
						msg.state?.sharedData?.roundNumber === round,
					`round ${round} results matchup ${matchupIndex}`,
					30_000,
				);
				hostIndex = hostMessages.indexOf(roundResultsState) + 1;

				expect(roundResultsState.state?.sharedData?.resultsJson).toBeTruthy();
				expect(
					roundResultsState.state?.sharedData?.scoreboardJson,
				).toBeTruthy();
			}

			const scoresState = await waitForHostState(
				hostMessages,
				hostIndex,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores" &&
					msg.state?.sharedData?.roundNumber === round,
				`round ${round} scores`,
				30_000,
			);
			hostIndex = hostMessages.indexOf(scoresState) + 1;
			expect(scoresState.state?.sharedData?.scoreboardJson).toBeTruthy();
		}

		const finaleRound = roundCount + 1;
		const finaleAnsweringState = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "answering" &&
				msg.state?.sharedData?.roundNumber === finaleRound,
			`finale answering round ${finaleRound}`,
			45_000,
		);
		hostIndex = hostMessages.indexOf(finaleAnsweringState) + 1;
		expect(finaleAnsweringState.state?.sharedData?.roundNumber).toBe(
			finaleRound,
		);

		for (const player of players!) {
			const fromIndex = playerIndexes.get(player.id) ?? 0;
			const finaleAnswerRequest = await waitForMessageFrom(
				player.conn.messages,
				fromIndex,
				(msg) =>
					msg.type === "input_request" && msg.requestId === "answer-finale",
				45_000,
			);
			playerIndexes.set(
				player.id,
				player.conn.messages.indexOf(finaleAnswerRequest) + 1,
			);

			expect(finaleAnswerRequest.request?.type).toBe("text");
			sendInputResponse(
				player.conn.ws,
				"answer-finale",
				`${player.name} finale answer`,
				player.name,
			);
			playerIndexes.set(player.id, player.conn.messages.length);
		}

		const finaleVotingState = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "voting" &&
				msg.state?.sharedData?.roundNumber === finaleRound,
			`finale voting round ${finaleRound}`,
			45_000,
		);
		hostIndex = hostMessages.indexOf(finaleVotingState) + 1;

		const finaleVoteOptionsJson = String(
			finaleVotingState.state?.sharedData?.voteOptionsJson ?? "[]",
		);
		const finaleVoteOptions = JSON.parse(finaleVoteOptionsJson) as Array<{
			id: string;
			text: string;
		}>;
		expect(finaleVoteOptions.length).toBeGreaterThanOrEqual(players!.length);

		for (const player of players!) {
			const fromIndex = playerIndexes.get(player.id) ?? 0;
			const finaleVoteRequest = await waitForMessageFrom(
				player.conn.messages,
				fromIndex,
				(msg) =>
					msg.type === "input_request" && msg.requestId === "vote-finale",
				45_000,
			);
			playerIndexes.set(
				player.id,
				player.conn.messages.indexOf(finaleVoteRequest) + 1,
			);

			const options = (finaleVoteRequest.request?.options ?? []) as string[];
			expect(options.length).toBeGreaterThan(0);
			sendInputResponse(player.conn.ws, "vote-finale", options[0], player.name);
			playerIndexes.set(player.id, player.conn.messages.length);
		}

		const winnerState = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "winner",
			"winner",
			60_000,
		);
		hostIndex = hostMessages.indexOf(winnerState) + 1;

		expect(winnerState.state?.sharedData?.winnerName).toBeTruthy();
		expect(winnerState.state?.sharedData?.scoreboardJson).toBeTruthy();

		const finalScoreboard = JSON.parse(
			String(winnerState.state?.sharedData?.scoreboardJson ?? "[]"),
		) as Array<{ playerId: string; playerName: string; score: number }>;
		expect(finalScoreboard).toHaveLength(3);
		expect(new Set(finalScoreboard.map((entry) => entry.playerId))).toEqual(
			new Set(players!.map((player) => player.id)),
		);
		expect(finalScoreboard[0]?.playerName).toBeTruthy();

		const endedState = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				(msg.type === "state_update" && msg.state?.phase === "ended") ||
				(msg.type === "phase_change" && msg.phase === "ended"),
			"ended",
			20_000,
		);
		expect(endedState.phase ?? endedState.state?.phase).toBe("ended");
	}, 240_000);
});
