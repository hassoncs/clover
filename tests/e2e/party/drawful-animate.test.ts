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

function formatMessageTimeline(
	messages: Connection["messages"],
	fromIndex: number,
) {
	return messages.slice(fromIndex).map((msg) => ({
		type: msg.type,
		phase: msg.state?.sharedData?.phase ?? msg.state?.phase ?? msg.phase,
		round: msg.state?.sharedData?.round,
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
			`[drawful-animate-e2e] timeout while waiting for ${label}; messages since index ${hostIndex}:`,
			JSON.stringify(formatMessageTimeline(hostMessages, hostIndex), null, 2),
		);
		throw error;
	}
}

async function waitForPlayerRequest(
	player: PlayerInfo,
	fromIndex: number,
	requestId: string,
	label: string,
	timeoutMs: number,
) {
	try {
		return await waitForMessageFrom(
			player.conn.messages,
			fromIndex,
			(msg) => msg.type === "input_request" && msg.requestId === requestId,
			timeoutMs,
		);
	} catch (error) {
		console.error(
			`[drawful-animate-e2e] timeout while waiting for ${label} (${requestId}) for ${player.name}; messages since index ${fromIndex}:`,
			JSON.stringify(
				formatMessageTimeline(player.conn.messages, fromIndex),
				null,
				2,
			),
		);
		throw error;
	}
}

describe("Drawful Animate E2E", () => {
	let cleanup: () => void = () => {};

	afterEach(() => {
		cleanup();
	});

	it("runs full game flow from ready-check to ended", async () => {
		const setup = await setupGameRoom("drawful-animate", PLAYER_NAMES, 3);
		cleanup = setup.cleanup;

		const { host, players } = setup;
		const hostMessages = host.messages;
		let hostIndex = hostMessages.length;
		const playerIndexes = new Map<string, number>(
			players.map((player) => [player.id, player.conn.messages.length]),
		);

		await startGameAndReady(host, players);
		await delay(100);

		const roundCount = 2;

		for (let round = 1; round <= roundCount; round++) {
			const drawingF1State = await waitForHostState(
				hostMessages,
				hostIndex,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "drawing_f1" &&
					msg.state.sharedData?.round === round,
				`round ${round} drawing_f1`,
				45_000,
			);
			hostIndex = hostMessages.indexOf(drawingF1State) + 1;
			expect(drawingF1State.state?.sharedData?.phase).toBe("drawing_f1");

			for (const player of players) {
				const requestIndex = playerIndexes.get(player.id) ?? 0;
				const drawingF1Request = await waitForPlayerRequest(
					player,
					requestIndex,
					"drawing-frame1",
					`round ${round} drawing frame 1`,
					45_000,
				);
				playerIndexes.set(
					player.id,
					player.conn.messages.indexOf(drawingF1Request) + 1,
				);
				expect(drawingF1Request.request?.type).toBe("drawing");
				expect(drawingF1Request.request?.metadata?.frameNumber).toBe(1);
				sendInputResponse(
					player.conn.ws,
					"drawing-frame1",
					"drawing-data",
					player.name,
				);
			}

			const drawingF2State = await waitForHostState(
				hostMessages,
				hostIndex,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "drawing_f2" &&
					msg.state.sharedData?.round === round,
				`round ${round} drawing_f2`,
				45_000,
			);
			hostIndex = hostMessages.indexOf(drawingF2State) + 1;
			expect(drawingF2State.state?.sharedData?.phase).toBe("drawing_f2");

			for (const player of players) {
				const requestIndex = playerIndexes.get(player.id) ?? 0;
				const drawingF2Request = await waitForPlayerRequest(
					player,
					requestIndex,
					"drawing-frame2",
					`round ${round} drawing frame 2`,
					45_000,
				);
				playerIndexes.set(
					player.id,
					player.conn.messages.indexOf(drawingF2Request) + 1,
				);
				expect(drawingF2Request.request?.type).toBe("drawing");
				expect(drawingF2Request.request?.metadata?.frameNumber).toBe(2);
				expect(
					drawingF2Request.request?.metadata?.onionSkinFrame1,
				).toBeTruthy();
				sendInputResponse(
					player.conn.ws,
					"drawing-frame2",
					"drawing-data",
					player.name,
				);
			}

			const bluffingState = await waitForHostState(
				hostMessages,
				hostIndex,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "bluffing" &&
					msg.state.sharedData?.round === round,
				`round ${round} bluffing`,
				45_000,
			);
			hostIndex = hostMessages.indexOf(bluffingState) + 1;
			expect(bluffingState.state?.sharedData?.phase).toBe("bluffing");

			for (const player of players) {
				const requestIndex = playerIndexes.get(player.id) ?? 0;
				const bluffRequest = await waitForPlayerRequest(
					player,
					requestIndex,
					"bluff",
					`round ${round} bluff`,
					45_000,
				);
				playerIndexes.set(
					player.id,
					player.conn.messages.indexOf(bluffRequest) + 1,
				);
				expect(bluffRequest.request?.type).toBe("text");
				sendInputResponse(
					player.conn.ws,
					"bluff",
					`${player.name} fake title round ${round}`,
					player.name,
				);
			}

			for (
				let animationIndex = 0;
				animationIndex < players.length;
				animationIndex++
			) {
				const votingState = await waitForHostState(
					hostMessages,
					hostIndex,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "voting" &&
						msg.state.sharedData?.round === round,
					`round ${round} voting animation ${animationIndex}`,
					45_000,
				);
				hostIndex = hostMessages.indexOf(votingState) + 1;

				const currentAnimation = votingState.state?.sharedData
					?.currentAnimation as
					| {
							artistName: string;
							titles: string[];
					  }
					| undefined;

				expect(currentAnimation).toBeTruthy();
				expect(Array.isArray(currentAnimation?.titles)).toBe(true);
				expect(currentAnimation?.titles.length).toBeGreaterThan(0);
				await delay(200);

				let votersResponded = 0;
				let nonVoters = 0;

				for (const player of players) {
					const requestIndex = playerIndexes.get(player.id) ?? 0;
					const voteRequest = player.conn.messages
						.slice(requestIndex)
						.find(
							(msg) => msg.type === "input_request" && msg.requestId === "vote",
						);

					if (!voteRequest) {
						nonVoters += 1;
						continue;
					}

					playerIndexes.set(
						player.id,
						player.conn.messages.indexOf(voteRequest) + 1,
					);
					expect(voteRequest.request?.type).toBe("choice");
					sendInputResponse(player.conn.ws, "vote", 0, player.name);
					votersResponded += 1;
				}

				expect(votersResponded).toBe(players.length - 1);
				expect(nonVoters).toBe(1);

				const revealState = await waitForHostState(
					hostMessages,
					hostIndex,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "reveal",
					`round ${round} reveal animation ${animationIndex}`,
					45_000,
				);
				hostIndex = hostMessages.indexOf(revealState) + 1;
				expect(revealState.state?.sharedData?.results).toBeTruthy();
			}

			const scoresState = await waitForHostState(
				hostMessages,
				hostIndex,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores" &&
					msg.state.sharedData?.round === round,
				`round ${round} scores`,
				45_000,
			);
			hostIndex = hostMessages.indexOf(scoresState) + 1;
			expect(scoresState.state?.sharedData?.scoreboard).toBeTruthy();
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

		const winner = winnerState.state?.sharedData?.winner as
			| { id: string; name: string; score: number }
			| undefined;
		const scoreboard = winnerState.state?.sharedData?.scoreboard as
			| Array<{ id: string; name: string; score: number }>
			| undefined;

		expect(winner).toBeTruthy();
		expect(winner?.id).toBeTruthy();
		expect(winner?.name).toBeTruthy();
		expect(typeof winner?.score).toBe("number");

		expect(scoreboard).toBeTruthy();
		expect(Array.isArray(scoreboard)).toBe(true);
		expect(scoreboard?.length).toBe(3);
		expect(scoreboard?.every((entry) => typeof entry.score === "number")).toBe(
			true,
		);
		expect(scoreboard?.some((entry) => entry.id === winner?.id)).toBe(true);

		const endedState = await waitForHostState(
			hostMessages,
			hostIndex,
			(msg) =>
				(msg.type === "state_update" && msg.state?.phase === "ended") ||
				(msg.type === "phase_change" && msg.phase === "ended"),
			"ended",
			30_000,
		);
		expect(endedState.phase ?? endedState.state?.phase).toBe("ended");
	}, 240_000);
});
