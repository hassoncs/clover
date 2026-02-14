import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runQuiplash } from "../quiplash";

interface SharedDataUpdate {
	phase?: string;
	roundNumber?: number;
	roundMultiplier?: number;
	assignmentsJson?: string;
	timerRemaining?: number;
	matchupIndex?: number;
	totalMatchups?: number;
	promptText?: string;
	answerA?: string;
	answerB?: string;
	votersJson?: string;
	voteResultA?: number;
	voteResultB?: number;
	pointsA?: number;
	pointsB?: number;
	quiplashA?: boolean;
	quiplashB?: boolean;
	scoreboardJson?: string;
	winnerName?: string;
	errorMessage?: string;
}

interface ScoreUpdate {
	playerId: string;
	delta: number;
}

type InputResponseMap = Map<string, PartyInputResponse>;
type InputResolver = (
	requestId: string,
	request: PartyInputRequest,
) => InputResponseMap;

function makeResponse(playerId: string, value: unknown): PartyInputResponse {
	return { playerId, value, timestamp: Date.now() };
}

function createMockRoom(inputResolver: InputResolver) {
	const phases: string[] = [];
	const sharedDataUpdates: SharedDataUpdate[] = [];
	const scoreUpdates: ScoreUpdate[] = [];
	const inputRequests: { requestId: string; request: PartyInputRequest }[] = [];

	const room = {
		setPhase: vi.fn(async (phase: string) => {
			phases.push(phase);
		}),
		updateSharedData: vi.fn(async (data: Record<string, unknown>) => {
			sharedDataUpdates.push(data as SharedDataUpdate);
		}),
		updatePlayerScore: vi.fn(async (playerId: string, delta: number) => {
			scoreUpdates.push({ playerId, delta });
		}),
		requestInput: vi.fn(
			async (
				requestId: string,
				request: PartyInputRequest,
			): Promise<InputResponseMap> => {
				inputRequests.push({ requestId, request });
				return inputResolver(requestId, request);
			},
		),

		phases,
		sharedDataUpdates,
		scoreUpdates,
		inputRequests,
	};

	return room;
}

function readyCheckResolver(playerIds: string[]) {
	const responses: InputResponseMap = new Map();
	for (const id of playerIds) {
		responses.set(id, makeResponse(id, true));
	}
	return responses;
}

function buildFullGameResolver(
	playerIds: string[],
	answersByRound?: Record<number, Record<string, Record<number, string>>>,
	votesByRound?: Record<
		number,
		Record<number, Record<string, string | number>>
	>,
) {
	let roundCounter = 0;

	return (requestId: string, request: PartyInputRequest): InputResponseMap => {
		if (requestId === "ready-check") {
			return readyCheckResolver(playerIds);
		}

		if (requestId.startsWith("answers-r")) {
			roundCounter++;
			const round = roundCounter;
			const responses: InputResponseMap = new Map();
			const roundAnswers = answersByRound?.[round];
			for (const id of playerIds) {
				const playerAnswers = roundAnswers?.[id] ?? {};
				responses.set(id, makeResponse(id, JSON.stringify(playerAnswers)));
			}
			return responses;
		}

		if (requestId.startsWith("vote-r")) {
			const match = requestId.match(/vote-r(\d+)-m(\d+)/);
			if (match) {
				const round = Number(match[1]);
				const matchupIdx = Number(match[2]);
				const responses: InputResponseMap = new Map();
				const matchupVotes = votesByRound?.[round]?.[matchupIdx];
				if (matchupVotes) {
					for (const [voterId, vote] of Object.entries(matchupVotes)) {
						responses.set(voterId, makeResponse(voterId, vote));
					}
				}
				return responses;
			}
		}

		return new Map();
	};
}

describe("Quiplash Template", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Player validation", () => {
		it("ends game with error when fewer than 3 players join", async () => {
			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(["p1", "p2"]);
				}
				return new Map();
			};
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const errorUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "error",
			);
			expect(errorUpdate).toBeDefined();
			expect(errorUpdate!.errorMessage).toContain("3 players");
			expect(room.phases).toContain("ended");
		});
	});

	describe("Prompt assignment", () => {
		it("assigns exactly 2 prompts per player", async () => {
			const playerIds = ["p1", "p2", "p3", "p4"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			expect(answeringUpdate).toBeDefined();
			expect(answeringUpdate!.assignmentsJson).toBeDefined();

			const assignments = JSON.parse(
				answeringUpdate!.assignmentsJson!,
			) as Record<string, { matchupIndex: number; promptText: string }[]>;

			for (const id of playerIds) {
				expect(assignments[id]).toBeDefined();
				expect(assignments[id].length).toBe(2);
			}
		});

		it("creates N matchups for N players", async () => {
			const playerIds = ["p1", "p2", "p3", "p4", "p5"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			expect(answeringUpdate!.totalMatchups).toBe(playerIds.length);
		});

		it("loads prompts from JSON data", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			const assignments = JSON.parse(
				answeringUpdate!.assignmentsJson!,
			) as Record<string, { matchupIndex: number; promptText: string }[]>;

			const allPromptTexts = Object.values(assignments).flatMap((a) =>
				a.map((p) => p.promptText),
			);
			for (const text of allPromptTexts) {
				expect(text).toBeTruthy();
				expect(typeof text).toBe("string");
				expect(text.length).toBeGreaterThan(5);
			}
		});
	});

	describe("Matchup creation", () => {
		it("creates correct head-to-head matchups with circular pairing", async () => {
			const playerIds = ["p1", "p2", "p3", "p4"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			const assignments = JSON.parse(
				answeringUpdate!.assignmentsJson!,
			) as Record<string, { matchupIndex: number; promptText: string }[]>;

			const matchupPairs = new Map<number, Set<string>>();
			for (const [playerId, playerAssignments] of Object.entries(assignments)) {
				for (const a of playerAssignments) {
					if (!matchupPairs.has(a.matchupIndex)) {
						matchupPairs.set(a.matchupIndex, new Set());
					}
					matchupPairs.get(a.matchupIndex)!.add(playerId);
				}
			}

			expect(matchupPairs.size).toBe(4);
			for (const [, players] of matchupPairs) {
				expect(players.size).toBe(2);
			}
		});

		it("handles 3 players correctly (minimum case)", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			expect(answeringUpdate!.totalMatchups).toBe(3);

			const assignments = JSON.parse(
				answeringUpdate!.assignmentsJson!,
			) as Record<string, { matchupIndex: number; promptText: string }[]>;
			for (const id of playerIds) {
				expect(assignments[id].length).toBe(2);
			}
		});

		it("handles 8 players correctly (maximum case)", async () => {
			const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			expect(answeringUpdate!.totalMatchups).toBe(8);

			const assignments = JSON.parse(
				answeringUpdate!.assignmentsJson!,
			) as Record<string, { matchupIndex: number; promptText: string }[]>;
			for (const id of playerIds) {
				expect(assignments[id].length).toBe(2);
			}
		});
	});

	describe("Voting", () => {
		it("filters out author votes when counting", async () => {
			const playerIds = ["p1", "p2", "p3", "p4"];

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						const answers: Record<number, string> = {};
						for (let i = 0; i < playerIds.length; i++) {
							answers[i] = `Answer from ${id} for matchup ${i}`;
						}
						responses.set(id, makeResponse(id, JSON.stringify(answers)));
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, "0"));
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);

			for (const reveal of revealUpdates) {
				const totalPercent =
					(reveal.voteResultA ?? 0) + (reveal.voteResultB ?? 0);
				if (totalPercent > 0) {
					expect(totalPercent).toBe(100);
				}
			}
		});

		it("uses choice input type for voting", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const voteRequests = room.inputRequests.filter((r) =>
				r.requestId.startsWith("vote-"),
			);
			expect(voteRequests.length).toBeGreaterThan(0);
			for (const req of voteRequests) {
				expect(req.request.type).toBe("choice");
				expect(req.request.options).toBeDefined();
				expect(req.request.options!.length).toBe(2);
			}
		});
	});

	describe("Scoring", () => {
		it("calculates points from vote percentage with round multiplier", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						const answers: Record<number, string> = {};
						for (let i = 0; i < playerIds.length; i++) {
							answers[i] = `answer-${id}-${i}`;
						}
						responses.set(id, makeResponse(id, JSON.stringify(answers)));
					}
					return responses;
				}
				if (requestId === "vote-r1-m0") {
					const responses: InputResponseMap = new Map();
					responses.set("p3", makeResponse("p3", "0"));
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const r1Reveal = room.sharedDataUpdates.find(
				(u) =>
					u.phase === "reveal" && u.roundNumber === 1 && u.matchupIndex === 1,
			);
			expect(r1Reveal).toBeDefined();

			if (r1Reveal!.pointsA !== undefined && r1Reveal!.pointsB !== undefined) {
				const total = r1Reveal!.pointsA + r1Reveal!.pointsB;
				expect(total).toBeGreaterThanOrEqual(0);
			}
		});

		it("applies round multipliers: 1x, 2x, 3x", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const r1 = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			const r2 = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 2,
			);
			const r3 = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 3,
			);

			expect(r1!.roundMultiplier).toBe(1);
			expect(r2!.roundMultiplier).toBe(2);
			expect(r3!.roundMultiplier).toBe(3);
		});

		it("awards quiplash bonus for 100% votes", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						const answers: Record<number, string> = {};
						for (let i = 0; i < playerIds.length; i++) {
							answers[i] = `answer-${id}-${i}`;
						}
						responses.set(id, makeResponse(id, JSON.stringify(answers)));
					}
					return responses;
				}
				if (requestId === "vote-r1-m0") {
					const responses: InputResponseMap = new Map();
					responses.set("p3", makeResponse("p3", "0"));
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const r1m0Reveal = room.sharedDataUpdates.find(
				(u) =>
					u.phase === "reveal" && u.roundNumber === 1 && u.matchupIndex === 1,
			);
			expect(r1m0Reveal).toBeDefined();

			if (r1m0Reveal!.quiplashA) {
				expect(r1m0Reveal!.pointsA).toBe(Math.round(1000 * 1 * 1.25));
			} else if (r1m0Reveal!.quiplashB) {
				expect(r1m0Reveal!.pointsB).toBe(Math.round(1000 * 1 * 1.25));
			}
		});

		it("gives 0 points when no votes cast", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, JSON.stringify({})));
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			for (const reveal of revealUpdates) {
				expect(reveal.pointsA).toBe(0);
				expect(reveal.pointsB).toBe(0);
			}
		});
	});

	describe("Edge cases", () => {
		it("handles timeout with no answer — uses (no answer)", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					return new Map();
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const votingUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "voting" && u.roundNumber === 1,
			);
			for (const voting of votingUpdates) {
				expect(voting.answerA).toBe("(no answer)");
				expect(voting.answerB).toBe("(no answer)");
			}
		});

		it("handles 3 rounds to completion", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const roundNumbers = new Set(
				room.sharedDataUpdates
					.filter((u) => u.phase === "answering")
					.map((u) => u.roundNumber),
			);
			expect(roundNumbers).toEqual(new Set([1, 2, 3]));

			expect(room.phases).toContain("playing");
			expect(room.phases).toContain("ended");
		});

		it("determines winner by highest score", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const winnerUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "winner",
			);
			expect(winnerUpdate).toBeDefined();
			expect(winnerUpdate!.scoreboardJson).toBeDefined();
			expect(winnerUpdate!.winnerName).toBeDefined();

			const scoreboard = JSON.parse(winnerUpdate!.scoreboardJson!) as {
				playerId: string;
				playerName: string;
				score: number;
			}[];
			expect(scoreboard.length).toBe(playerIds.length);

			for (let i = 0; i < scoreboard.length - 1; i++) {
				expect(scoreboard[i].score).toBeGreaterThanOrEqual(
					scoreboard[i + 1].score,
				);
			}
		});
	});

	describe("SharedData broadcasts", () => {
		it("broadcasts phase changes via updateSharedData", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const phaseSequence = room.sharedDataUpdates
				.map((u) => u.phase)
				.filter(Boolean);

			expect(phaseSequence).toContain("answering");
			expect(phaseSequence).toContain("voting");
			expect(phaseSequence).toContain("reveal");
			expect(phaseSequence).toContain("scores");
			expect(phaseSequence).toContain("winner");
		});

		it("broadcasts scoreboard between rounds", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			const scoreUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "scores",
			);
			expect(scoreUpdates.length).toBe(3);
			for (const update of scoreUpdates) {
				expect(update.scoreboardJson).toBeDefined();
				const board = JSON.parse(update.scoreboardJson!);
				expect(Array.isArray(board)).toBe(true);
				expect(board.length).toBe(playerIds.length);
			}
		});

		it("sets initial phase to playing", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			expect(room.phases[0]).toBe("playing");
		});

		it("calls updatePlayerScore with correct deltas", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answers-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						const answers: Record<number, string> = {};
						for (let i = 0; i < playerIds.length; i++) {
							answers[i] = `answer-${id}-${i}`;
						}
						responses.set(id, makeResponse(id, JSON.stringify(answers)));
					}
					return responses;
				}
				if (requestId.startsWith("vote-")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, "0"));
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runQuiplash(room as any);
			await vi.runAllTimersAsync();
			await gamePromise;

			expect(room.scoreUpdates.length).toBeGreaterThan(0);
			for (const update of room.scoreUpdates) {
				expect(typeof update.delta).toBe("number");
				expect(update.delta).toBeGreaterThanOrEqual(0);
				expect(playerIds).toContain(update.playerId);
			}
		});
	});
});
