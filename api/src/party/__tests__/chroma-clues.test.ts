import type { PartyInputResponse } from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ServerScriptRoom,
	QuickJSServerRunner as ServerScriptRunner,
} from "../QuickJSServerRunner";

const SERVER_SCRIPT = `
var party = require("slopcade/party");

var CLUE_TIME_LIMIT = 30;
var GUESS_TIME_LIMIT = 45;
var REVEAL_DURATION_MS = 6000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;
var GRID_SIZE = 20;
var POINTS_EXACT = 3;
var POINTS_ADJACENT = 2;
var POINTS_FRAME = 1;
var POINTS_CUE_GIVER_PER_MARKER = 1;

function chebyshevDistance(pos1, pos2) {
	var dx = Math.abs(pos1.col - pos2.col);
	var dy = Math.abs(pos1.row - pos2.row);
	return Math.max(dx, dy);
}

function calculateGuesserPoints(guess, target) {
	var distance = chebyshevDistance(guess, target);
	if (distance === 0) return POINTS_EXACT;
	if (distance <= 1) return POINTS_ADJACENT;
	if (distance === 2) return POINTS_FRAME;
	return 0;
}

function countMarkersInFrame(markers, target) {
	var count = 0;
	var i, distance;
	for (i = 0; i < markers.length; i++) {
		distance = chebyshevDistance(markers[i].position, target);
		if (distance <= 2) count++;
	}
	return count;
}

function indexToPosition(index) {
	return {
		row: Math.floor(index / GRID_SIZE),
		col: index % GRID_SIZE,
	};
}

function generateGridChoices() {
	var choices = [];
	var i;
	for (i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
		choices.push(i.toString());
	}
	return choices;
}

function generateRandomTarget() {
	return {
		row: Math.floor(Math.random() * GRID_SIZE),
		col: Math.floor(Math.random() * GRID_SIZE),
	};
}

function formatPosition(pos) {
	var colLetter = String.fromCharCode(65 + pos.col);
	var rowNum = GRID_SIZE - pos.row;
	return colLetter + rowNum;
}

exports.run = async (room, config) => {
	var i, round;
	var readyResponses, playerIds, playerNames, scores, roundCount;
	var cueGiverId, guessers, targetPosition, clueResponse, clueText;
	var guessResponses, markers, results, scoreboard, winner;
	var markersInFrame, cueGiverBonus, index, points, distance;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to Chroma Clues! Get ready to guess colors!",
		timeLimit: 5,
	});

	playerIds = [];
	playerNames = {};
	scores = {};

	readyResponses.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] = response.playerName || playerId.slice(0, 6);
		scores[playerId] = 0;
	});

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players to play Chroma Clues.",
		});
		await room.setPhase("ended");
		return;
	}

	roundCount = (config && config.roundCount) || DEFAULT_ROUND_COUNT;

	for (round = 1; round <= roundCount; round++) {
		cueGiverId = playerIds[(round - 1) % playerIds.length];
		guessers = playerIds.filter((id) => id !== cueGiverId);

		targetPosition = generateRandomTarget();

		await room.sendToPlayer(cueGiverId, {
			type: "target_position",
			row: targetPosition.row,
			col: targetPosition.col,
			positionLabel: formatPosition(targetPosition),
		});

		await room.updateSharedData({
			phase: "clue_giving",
			round: round,
			roundCount: roundCount,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			gridSize: GRID_SIZE,
		});

		clueResponse = await room.requestInputFromSubset(
			"clue",
			{
				type: "text",
				prompt:
					"Give a one-word clue for position " +
					formatPosition(targetPosition) +
					" on the color grid!",
				timeLimit: CLUE_TIME_LIMIT,
			},
			[cueGiverId],
		);

		clueText = clueResponse.get(cueGiverId)?.value || "color";

		await room.updateSharedData({
			phase: "first_guess",
			round: round,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			clue: clueText,
			gridSize: GRID_SIZE,
			markerNumber: 1,
			markers: [],
		});

		guessResponses = await room.requestInputFromSubset(
			"first_guess",
			{
				type: "choice",
				prompt: "Place your first marker! Clue: " + clueText,
				choices: generateGridChoices(),
				timeLimit: GUESS_TIME_LIMIT,
			},
			guessers,
		);

		markers = [];
		guessResponses.forEach((response, guesserId) => {
			index = parseInt(response.value, 10);
			if (!isNaN(index) && index >= 0 && index < GRID_SIZE * GRID_SIZE) {
				markers.push({
					playerId: guesserId,
					playerName: playerNames[guesserId],
					markerNumber: 1,
					position: indexToPosition(index),
				});
			}
		});

		await room.updateSharedData({
			phase: "second_guess",
			round: round,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			clue: clueText,
			gridSize: GRID_SIZE,
			markerNumber: 2,
			markers: markers,
		});

		guessResponses = await room.requestInputFromSubset(
			"second_guess",
			{
				type: "choice",
				prompt: "Place your second marker! Clue: " + clueText,
				choices: generateGridChoices(),
				timeLimit: GUESS_TIME_LIMIT,
			},
			guessers,
		);

		guessResponses.forEach((response, guesserId) => {
			index = parseInt(response.value, 10);
			if (!isNaN(index) && index >= 0 && index < GRID_SIZE * GRID_SIZE) {
				markers.push({
					playerId: guesserId,
					playerName: playerNames[guesserId],
					markerNumber: 2,
					position: indexToPosition(index),
				});
			}
		});

		results = {
			targetPosition: targetPosition,
			targetLabel: formatPosition(targetPosition),
			clue: clueText,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			markers: markers,
			markerResults: [],
			pointsEarned: {},
		};

		playerIds.forEach((id) => {
			results.pointsEarned[id] = 0;
		});

		markers.forEach((marker) => {
			points = calculateGuesserPoints(marker.position, targetPosition);
			distance = chebyshevDistance(marker.position, targetPosition);

			results.markerResults.push({
				playerId: marker.playerId,
				playerName: marker.playerName,
				markerNumber: marker.markerNumber,
				position: marker.position,
				positionLabel: formatPosition(marker.position),
				distance: distance,
				points: points,
			});

			scores[marker.playerId] += points;
			results.pointsEarned[marker.playerId] += points;
		});

		markersInFrame = countMarkersInFrame(markers, targetPosition);
		cueGiverBonus = markersInFrame * POINTS_CUE_GIVER_PER_MARKER;
		scores[cueGiverId] += cueGiverBonus;
		results.pointsEarned[cueGiverId] += cueGiverBonus;
		results.cueGiverBonus = cueGiverBonus;
		results.markersInFrame = markersInFrame;

		await room.updateSharedData({
			phase: "reveal",
			round: round,
			results: results,
			scores: scores,
		});
		await room.delay(REVEAL_DURATION_MS);

		scoreboard = playerIds
			.map((id) => ({
				id: id,
				name: playerNames[id],
				score: scores[id],
			}))
			.sort((a, b) => b.score - a.score);

		await room.updateSharedData({
			phase: "scores",
			scoreboard: scoreboard,
			round: round,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	scoreboard = playerIds
		.map((id) => ({
			id: id,
			name: playerNames[id],
			score: scores[id],
		}))
		.sort((a, b) => b.score - a.score);

	winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
`;

interface ReadyResponse extends PartyInputResponse {
	playerName: string;
}

function createMockRoom(): ServerScriptRoom {
	return {
		setPhase: vi.fn(async () => undefined),
		updateSharedData: vi.fn(async () => undefined),
		requestInput: vi.fn(async () => new Map()),
		requestInputFromSubset: vi.fn(async () => new Map()),
		sendToPlayer: vi.fn(async () => undefined),
		updatePlayerScore: vi.fn(async () => undefined),
		getPlayers: vi.fn(() => ["p1", "p2", "p3"]),
	};
}

function setupFullGameMock(room: ServerScriptRoom, players: string[]): void {
	const playerSet = new Set(players);

	room.requestInput = vi.fn(async () => createReadyResponses(players));

	room.requestInputFromSubset = vi.fn(async (requestId, _request, subset) => {
		if (requestId === "clue") {
			return createClueResponse(subset[0], "sunset");
		}

		if (requestId === "first_guess" || requestId === "second_guess") {
			const guessers = subset.filter((id) => playerSet.has(id));
			const guesses = guessers.map((playerId) => ({
				playerId,
				gridIndex: Math.floor(Math.random() * 400),
			}));
			return createGuessResponses(guesses);
		}

		return new Map();
	});
}

function createReadyResponses(playerIds: string[]): Map<string, ReadyResponse> {
	const responses = new Map<string, ReadyResponse>();
	const timestamp = Date.now();
	for (const id of playerIds) {
		responses.set(id, {
			playerId: id,
			value: "",
			timestamp,
			playerName: `Player ${id}`,
		});
	}
	return responses;
}

function createClueResponse(
	cueGiverId: string,
	clue: string,
): Map<string, PartyInputResponse> {
	const responses = new Map<string, PartyInputResponse>();
	responses.set(cueGiverId, {
		playerId: cueGiverId,
		value: clue,
		timestamp: Date.now(),
	});
	return responses;
}

function createGuessResponses(
	guesses: Array<{ playerId: string; gridIndex: number }>,
): Map<string, PartyInputResponse> {
	const responses = new Map<string, PartyInputResponse>();
	const timestamp = Date.now();
	for (const guess of guesses) {
		responses.set(guess.playerId, {
			playerId: guess.playerId,
			value: guess.gridIndex.toString(),
			timestamp,
		});
	}
	return responses;
}

describe("Chroma Clues Server Script", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Game Flow", () => {
		it("requires minimum 3 players", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);

			room.requestInput = vi.fn(async () => createReadyResponses(["p1", "p2"]));

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(1000);
			await executePromise;

			expect(room.updateSharedData).toHaveBeenCalledWith(
				expect.objectContaining({
					phase: "error",
					errorMessage: expect.stringContaining("3 players"),
				}),
			);
		});

		it("sends target position to cue giver", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			expect(room.sendToPlayer).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: "target_position",
					row: expect.any(Number),
					col: expect.any(Number),
					positionLabel: expect.any(String),
				}),
			);
		});

		it("runs for configured round count", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 2 });
			await vi.advanceTimersByTimeAsync(60000);
			await executePromise;

			const phaseCalls = (room.updateSharedData as ReturnType<typeof vi.fn>)
				.mock.calls;
			const phaseValues = phaseCalls.map((call) => call[0].phase);

			const clueGivingCount = phaseValues.filter(
				(p) => p === "clue_giving",
			).length;
			expect(clueGivingCount).toBe(2);
		});

		it("declares winner at end", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const lastCalls = (
				room.updateSharedData as ReturnType<typeof vi.fn>
			).mock.calls.slice(-3);
			const lastPhase = lastCalls[lastCalls.length - 1]?.[0]?.phase;
			expect(lastPhase).toBe("winner");
		});
	});

	describe("Phase Transitions", () => {
		it("transitions through all phases in order", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const phaseCalls = (room.updateSharedData as ReturnType<typeof vi.fn>)
				.mock.calls;
			const phases = phaseCalls.map((call) => call[0].phase);

			expect(phases).toContain("clue_giving");
			expect(phases).toContain("first_guess");
			expect(phases).toContain("second_guess");
			expect(phases).toContain("reveal");
			expect(phases).toContain("scores");
			expect(phases).toContain("winner");
		});

		it("uses correct time limits for each phase", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const requestCalls = (
				room.requestInputFromSubset as ReturnType<typeof vi.fn>
			).mock.calls;

			const clueCalls = requestCalls.filter((call) => call[0] === "clue");
			for (const call of clueCalls) {
				expect(call[1].timeLimit).toBe(30);
			}

			const guessCalls = requestCalls.filter((call) =>
				["first_guess", "second_guess"].includes(call[0]),
			);
			for (const call of guessCalls) {
				expect(call[1].timeLimit).toBe(45);
			}
		});
	});

	describe("Grid System", () => {
		it("generates valid grid choices (0-399)", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const requestCalls = (
				room.requestInputFromSubset as ReturnType<typeof vi.fn>
			).mock.calls;
			const guessCalls = requestCalls.filter((call) =>
				["first_guess", "second_guess"].includes(call[0]),
			);

			expect(guessCalls.length).toBeGreaterThan(0);

			for (const call of guessCalls) {
				const choices = call[1].choices as string[];
				expect(choices).toHaveLength(400);
				expect(choices[0]).toBe("0");
				expect(choices[399]).toBe("399");
			}
		});

		it("formats position labels correctly (A20-T1)", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const sendCalls = (room.sendToPlayer as ReturnType<typeof vi.fn>).mock
				.calls;
			const targetCall = sendCalls.find((call) => {
				const data = call[1] as Record<string, unknown>;
				return data.type === "target_position";
			});
			expect(targetCall).toBeDefined();

			const positionLabel = targetCall?.[1]?.positionLabel as string;
			expect(positionLabel).toMatch(/^[A-T]\d+$/);
		});
	});

	describe("Cue Giver Bonus", () => {
		it("awards bonus points based on markers in frame", async () => {
			const room = createMockRoom();
			const runner = new ServerScriptRunner(room);
			const players = ["p1", "p2", "p3"];

			setupFullGameMock(room, players);

			const executePromise = runner.execute(SERVER_SCRIPT, { roundCount: 1 });
			await vi.advanceTimersByTimeAsync(30000);
			await executePromise;

			const updateCalls = (room.updateSharedData as ReturnType<typeof vi.fn>)
				.mock.calls;
			const revealCall = updateCalls.find((call) => call[0].phase === "reveal");
			expect(revealCall).toBeDefined();

			const results = revealCall?.[0]?.results as
				| Record<string, unknown>
				| undefined;
			expect(results).toHaveProperty("cueGiverBonus");
			expect(results).toHaveProperty("markersInFrame");
		});
	});
});
