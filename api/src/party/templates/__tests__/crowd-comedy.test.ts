import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCrowdComedy } from "../crowd-comedy";

interface SharedDataUpdate {
	phase?: string;
	roundNumber?: number;
	totalRounds?: number;
	promptText?: string;
	answersJson?: string;
	voteOptionsJson?: string;
	timerRemaining?: number;
	resultsJson?: string;
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
	let lastVoteOptionsJson: string | undefined;

	const room = {
		setPhase: vi.fn(async (phase: string) => {
			phases.push(phase);
		}),
		updateSharedData: vi.fn(async (data: Record<string, unknown>) => {
			sharedDataUpdates.push(data as SharedDataUpdate);
			if (data.voteOptionsJson) {
				lastVoteOptionsJson = data.voteOptionsJson as string;
			}
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
		lastVoteOptionsJson: () => lastVoteOptionsJson,
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
	answersByRound?: Record<number, Record<string, string>>,
	votesByRound?: Record<number, Record<string, string>>,
) {
	let roundCounter = 0;

	return (requestId: string, request: PartyInputRequest): InputResponseMap => {
		if (requestId === "ready-check") {
			return readyCheckResolver(playerIds);
		}

		if (requestId.startsWith("answer-r")) {
			roundCounter++;
			const round = roundCounter;
			const responses: InputResponseMap = new Map();
			const roundAnswers = answersByRound?.[round];
			for (const id of playerIds) {
				const answer = roundAnswers?.[id] ?? `Answer from ${id}`;
				responses.set(id, makeResponse(id, answer));
			}
			return responses;
		}

		if (requestId.startsWith("vote-r")) {
			const roundMatch = requestId.match(/vote-r(\d+)/);
			if (roundMatch) {
				const round = Number(roundMatch[1]);
				const responses: InputResponseMap = new Map();
				const roundVotes = votesByRound?.[round];
				if (roundVotes) {
					for (const [voterId, vote] of Object.entries(roundVotes)) {
						responses.set(voterId, makeResponse(voterId, vote));
					}
				}
				return responses;
			}
		}

		return new Map();
	};
}

describe("CrowdComedy Template", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Player validation", () => {
		it("ends game with error when fewer than 3 players respond to ready check", async () => {
			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(["p1", "p2"]);
				}
				return new Map();
			};
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const errorUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "error",
			);
			expect(errorUpdate).toBeDefined();
			expect(errorUpdate!.errorMessage).toContain("3 players");
			expect(room.phases).toContain("ended");
		});

		it("accepts exactly 3 players", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const errorUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "error",
			);
			expect(errorUpdate).toBeUndefined();
			expect(room.phases).toContain("ended");
		});
	});

	describe("Round cycle progression", () => {
		it("progresses through phases: answering → reveal → voting → round_results → scores", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const phaseSequence = room.sharedDataUpdates
				.map((u) => u.phase)
				.filter(Boolean);

			expect(phaseSequence).toContain("answering");
			expect(phaseSequence).toContain("reveal");
			expect(phaseSequence).toContain("voting");
			expect(phaseSequence).toContain("round_results");
			expect(phaseSequence).toContain("scores");

			const round1Answering = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			const round1Reveal = room.sharedDataUpdates.find(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			const round1Voting = room.sharedDataUpdates.find(
				(u) => u.phase === "voting" && u.roundNumber === 1,
			);
			const round1Results = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			const round1Scores = room.sharedDataUpdates.find(
				(u) => u.phase === "scores" && u.roundNumber === 1,
			);

			expect(round1Answering).toBeDefined();
			expect(round1Reveal).toBeDefined();
			expect(round1Voting).toBeDefined();
			expect(round1Results).toBeDefined();
			expect(round1Scores).toBeDefined();

			expect(round1Answering!.roundNumber).toBe(1);
			expect(round1Reveal!.roundNumber).toBe(1);
			expect(round1Voting!.roundNumber).toBe(1);
		});
	});

	describe("Round count", () => {
		it("plays exactly 5 rounds", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const roundNumbers = new Set(
				room.sharedDataUpdates
					.filter((u) => u.phase === "answering")
					.map((u) => u.roundNumber),
			);
			expect(roundNumbers).toEqual(new Set([1, 2, 3, 4, 5]));
		});

		it("sets totalRounds to 5 in shared data", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "answering",
			);
			for (const update of answeringUpdates) {
				expect(update.totalRounds).toBe(5);
			}
		});
	});

	describe("Voting", () => {
		it("rejects self-votes - a vote for one's own answer does not count", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "Answer A", p2: "Answer B", p3: "Answer C" },
			};

			const votesByRound: Record<number, Record<string, string>> = {
				1: { p1: "answerA", p2: "answerB", p3: "answerC" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					const roundAnswers = answersByRound[1];
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, roundAnswers[id]));
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const responses: InputResponseMap = new Map();
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, votesByRound[1][id]));
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const round1Results = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			expect(round1Results).toBeDefined();

			const results = JSON.parse(round1Results!.resultsJson!) as Array<{
				text: string;
				voteCount: number;
				points: number;
			}>;

			for (const result of results) {
				expect(result.voteCount).toBe(0);
				expect(result.points).toBe(0);
			}
		});

		it("uses choice input type for voting", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const voteRequests = room.inputRequests.filter((r) =>
				r.requestId.startsWith("vote-"),
			);
			expect(voteRequests.length).toBeGreaterThan(0);
			for (const req of voteRequests) {
				expect(req.request.type).toBe("choice");
				expect(req.request.options).toBeDefined();
			}
		});

		it("sends all answers as vote options", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const votingUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "voting" && u.roundNumber === 1,
			);
			expect(votingUpdate).toBeDefined();
			expect(votingUpdate!.voteOptionsJson).toBeDefined();

			const voteOptions = JSON.parse(votingUpdate!.voteOptionsJson!);
			expect(voteOptions.length).toBe(playerIds.length);
		});
	});

	describe("Scoring", () => {
		it("awards 100 points per vote received", async () => {
			const playerIds = ["p1", "p2", "p3", "p4"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "Answer A", p2: "Answer B", p3: "Answer C", p4: "Answer D" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
				roomRef: ReturnType<typeof createMockRoom>,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					const roundAnswers = answersByRound[1];
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, roundAnswers[id]));
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const voteOptionsJson = roomRef.lastVoteOptionsJson();
					const voteOptions = voteOptionsJson
						? JSON.parse(voteOptionsJson)
						: [];
					const responses: InputResponseMap = new Map();
					if (voteOptions.length > 0) {
						const targetAnswerId = voteOptions[0].id;
						for (const id of playerIds) {
							responses.set(id, makeResponse(id, targetAnswerId));
						}
					}
					return responses;
				}
				return new Map();
			};

			const baseResolver = (requestId: string, request: PartyInputRequest) =>
				resolver(requestId, request, room);
			const room = createMockRoom(baseResolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const round1Results = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			expect(round1Results).toBeDefined();

			const results = JSON.parse(round1Results!.resultsJson!) as Array<{
				text: string;
				voteCount: number;
				points: number;
			}>;

			const answersWithVotes = results.filter((r) => r.voteCount > 0);
			expect(answersWithVotes.length).toBeGreaterThan(0);

			for (const result of answersWithVotes) {
				expect(result.points).toBeGreaterThanOrEqual(result.voteCount * 100);
			}
		});

		it("awards +50 clean sweep bonus when answer gets all valid votes", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "AnswerA", p2: "AnswerB", p3: "AnswerC" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
				roomRef: ReturnType<typeof createMockRoom>,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					const roundAnswers = answersByRound[1];
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, roundAnswers[id]));
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const voteOptionsJson = roomRef.lastVoteOptionsJson();
					const voteOptions = voteOptionsJson
						? JSON.parse(voteOptionsJson)
						: [];
					const responses: InputResponseMap = new Map();
					if (voteOptions.length > 0) {
						const targetAnswerId = voteOptions[0].id;
						for (const id of playerIds) {
							responses.set(id, makeResponse(id, targetAnswerId));
						}
					}
					return responses;
				}
				return new Map();
			};

			const baseResolver = (requestId: string, request: PartyInputRequest) =>
				resolver(requestId, request, room);
			const room = createMockRoom(baseResolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const round1Results = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			expect(round1Results).toBeDefined();

			const results = JSON.parse(round1Results!.resultsJson!) as Array<{
				text: string;
				voteCount: number;
				points: number;
			}>;

			const sortedByVotes = [...results].sort(
				(a, b) => b.voteCount - a.voteCount,
			);
			const topAnswer = sortedByVotes[0];
			expect(topAnswer.voteCount).toBe(2);
			expect(topAnswer.points).toBe(250);
		});

		it("updates player scores via updatePlayerScore", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "A", p2: "B", p3: "C" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
				roomRef: ReturnType<typeof createMockRoom>,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					const roundAnswers = answersByRound[1];
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, roundAnswers[id]));
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const voteOptionsJson = roomRef.lastVoteOptionsJson();
					const voteOptions = voteOptionsJson
						? JSON.parse(voteOptionsJson)
						: [];
					const responses: InputResponseMap = new Map();
					if (voteOptions.length > 0) {
						const targetAnswerId = voteOptions[0].id;
						for (const id of playerIds) {
							responses.set(id, makeResponse(id, targetAnswerId));
						}
					}
					return responses;
				}
				return new Map();
			};

			const baseResolver = (requestId: string, request: PartyInputRequest) =>
				resolver(requestId, request, room);
			const room = createMockRoom(baseResolver);
			const gamePromise = runCrowdComedy(room as never);
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

	describe("Timeout handling", () => {
		it("adds (no answer) entry for players who don't respond", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					return new Map();
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			expect(revealUpdate).toBeDefined();
			expect(revealUpdate!.answersJson).toBeDefined();

			const answers = JSON.parse(revealUpdate!.answersJson!);
			const noAnswerEntries = answers.filter(
				(a: { text: string }) => a.text === "(no answer)",
			);
			expect(noAnswerEntries.length).toBe(playerIds.length);
		});

		it("uses text input type for answers", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answerRequests = room.inputRequests.filter((r) =>
				r.requestId.startsWith("answer-"),
			);
			expect(answerRequests.length).toBeGreaterThan(0);
			for (const req of answerRequests) {
				expect(req.request.type).toBe("text");
				expect(req.request.prompt).toBeDefined();
			}
		});
	});

	describe("Winner determination", () => {
		it("determines winner by highest score", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "A", p2: "B", p3: "C" },
				2: { p1: "D", p2: "E", p3: "F" },
				3: { p1: "G", p2: "H", p3: "I" },
				4: { p1: "J", p2: "K", p3: "L" },
				5: { p1: "M", p2: "N", p3: "O" },
			};

			const votesByRound: Record<number, Record<string, string>> = {
				1: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
				2: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
				3: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
				4: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
				5: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const roundMatch = requestId.match(/answer-r(\d+)/);
					if (roundMatch) {
						const round = Number(roundMatch[1]);
						const responses: InputResponseMap = new Map();
						const roundAnswers = answersByRound[round];
						let idx = 0;
						for (const id of playerIds) {
							responses.set(
								id,
								makeResponse(id, roundAnswers?.[id] ?? "answer"),
							);
							idx++;
						}
						return responses;
					}
				}
				if (requestId.startsWith("vote-r")) {
					const roundMatch = requestId.match(/vote-r(\d+)/);
					if (roundMatch) {
						const round = Number(roundMatch[1]);
						const responses: InputResponseMap = new Map();
						let idx = 0;
						for (const id of playerIds) {
							responses.set(id, makeResponse(id, `answerId${idx}`));
							idx++;
						}
						return responses;
					}
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const winnerUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "winner",
			);
			expect(winnerUpdate).toBeDefined();
			expect(winnerUpdate!.scoreboardJson).toBeDefined();
			expect(winnerUpdate!.winnerName).toBeDefined();

			const scoreboard = JSON.parse(winnerUpdate!.scoreboardJson!) as Array<{
				playerId: string;
				playerName: string;
				score: number;
			}>;
			expect(scoreboard.length).toBe(playerIds.length);

			for (let i = 0; i < scoreboard.length - 1; i++) {
				expect(scoreboard[i].score).toBeGreaterThanOrEqual(
					scoreboard[i + 1].score,
				);
			}

			expect(winnerUpdate!.winnerName).toBe(scoreboard[0].playerName);
		});
	});

	describe("Anonymous answers", () => {
		it("reveal phase answersJson does not contain playerIds", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			expect(revealUpdate).toBeDefined();
			expect(revealUpdate!.answersJson).toBeDefined();

			const answers = JSON.parse(revealUpdate!.answersJson!);

			for (const answer of answers) {
				expect(answer).not.toHaveProperty("authorId");
				expect(answer).toHaveProperty("id");
				expect(answer).toHaveProperty("text");
			}
		});

		it("each answer has a unique opaque id", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			expect(revealUpdate).toBeDefined();

			const answers = JSON.parse(revealUpdate!.answersJson!);
			const ids = answers.map((a: { id: string }) => a.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});
	});

	describe("Phase management", () => {
		it("sets initial phase to playing", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			expect(room.phases[0]).toBe("playing");
		});

		it("calls setPhase(ended) at game end", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			expect(room.phases).toContain("ended");
			expect(room.phases[room.phases.length - 1]).toBe("ended");
		});
	});

	describe("Scoreboard", () => {
		it("broadcasts scoreboard in round_results phase", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const scoreUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "round_results",
			);
			expect(scoreUpdates.length).toBe(5);
			for (const update of scoreUpdates) {
				expect(update.scoreboardJson).toBeDefined();
				const board = JSON.parse(update.scoreboardJson!);
				expect(Array.isArray(board)).toBe(true);
				expect(board.length).toBe(playerIds.length);
			}
		});

		it("broadcasts scoreboard in scores phase", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const scoreUpdates = room.sharedDataUpdates.filter(
				(u) => u.phase === "scores",
			);
			expect(scoreUpdates.length).toBe(5);
			for (const update of scoreUpdates) {
				expect(update.scoreboardJson).toBeDefined();
				const board = JSON.parse(update.scoreboardJson!);
				expect(Array.isArray(board)).toBe(true);
				expect(board.length).toBe(playerIds.length);
			}
		});
	});

	describe("Round results", () => {
		it("includes vote count and points in results", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const resolver = (requestId: string): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					let idx = 0;
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, `Answer ${idx}`));
						idx++;
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const responses: InputResponseMap = new Map();
					let idx = 0;
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, `answerId${idx}`));
						idx++;
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const roundResults = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			expect(roundResults).toBeDefined();
			expect(roundResults!.resultsJson).toBeDefined();

			const results = JSON.parse(roundResults!.resultsJson!) as Array<{
				answerId: string;
				text: string;
				authorName: string;
				voteCount: number;
				points: number;
			}>;

			expect(results.length).toBe(playerIds.length);
			for (const result of results) {
				expect(result).toHaveProperty("answerId");
				expect(result).toHaveProperty("text");
				expect(result).toHaveProperty("authorName");
				expect(result).toHaveProperty("voteCount");
				expect(result).toHaveProperty("points");
			}
		});

		it("sorts results by vote count descending", async () => {
			const playerIds = ["p1", "p2", "p3"];

			const answersByRound: Record<number, Record<string, string>> = {
				1: { p1: "Popular", p2: "Medium", p3: "Unpopular" },
			};

			const votesByRound: Record<number, Record<string, string>> = {
				1: { p1: "answerId0", p2: "answerId0", p3: "answerId0" },
			};

			const resolver = (
				requestId: string,
				request: PartyInputRequest,
			): InputResponseMap => {
				if (requestId === "ready-check") {
					return readyCheckResolver(playerIds);
				}
				if (requestId.startsWith("answer-r")) {
					const responses: InputResponseMap = new Map();
					const roundAnswers = answersByRound[1];
					let idx = 0;
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, roundAnswers[id]));
						idx++;
					}
					return responses;
				}
				if (requestId.startsWith("vote-r")) {
					const responses: InputResponseMap = new Map();
					let idx = 0;
					for (const id of playerIds) {
						responses.set(id, makeResponse(id, `answerId${idx}`));
						idx++;
					}
					return responses;
				}
				return new Map();
			};

			const room = createMockRoom(resolver);
			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const roundResults = room.sharedDataUpdates.find(
				(u) => u.phase === "round_results" && u.roundNumber === 1,
			);
			const results = JSON.parse(roundResults!.resultsJson!);

			for (let i = 0; i < results.length - 1; i++) {
				expect(results[i].voteCount).toBeGreaterThanOrEqual(
					results[i + 1].voteCount,
				);
			}
		});
	});

	describe("Timer updates", () => {
		it("sets timerRemaining in answering phase", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const answeringUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "answering" && u.roundNumber === 1,
			);
			expect(answeringUpdate).toBeDefined();
			expect(answeringUpdate!.timerRemaining).toBeGreaterThan(0);
		});

		it("sets timerRemaining to 0 in reveal phase", async () => {
			const playerIds = ["p1", "p2", "p3"];
			const resolver = buildFullGameResolver(playerIds);
			const room = createMockRoom(resolver);

			const gamePromise = runCrowdComedy(room as never);
			await vi.runAllTimersAsync();
			await gamePromise;

			const revealUpdate = room.sharedDataUpdates.find(
				(u) => u.phase === "reveal" && u.roundNumber === 1,
			);
			expect(revealUpdate).toBeDefined();
			expect(revealUpdate!.timerRemaining).toBe(0);
		});
	});
});
