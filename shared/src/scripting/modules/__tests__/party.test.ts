import { describe, expect, it } from "vitest";
import { SLOPCADE_MODULES } from "../index";

function loadModule(source: string) {
	const mod = { exports: {} as Record<string, unknown> };
	const fn = new Function("module", "exports", source);
	fn(mod, mod.exports);
	return mod.exports as Record<string, (...args: unknown[]) => unknown>;
}

describe("slopcade/party module", () => {
	const party = loadModule(SLOPCADE_MODULES["slopcade/party"]);

	describe("createScoreboard", () => {
		it("should create sorted scoreboard from scores and player names", () => {
			const scores = { p1: 100, p2: 250, p3: 50 };
			const playerNames = { p1: "Alice", p2: "Bob", p3: "Charlie" };

			const result = party.createScoreboard(scores, playerNames) as Array<{
				playerId: string;
				playerName: string;
				score: number;
			}>;

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({
				playerId: "p2",
				playerName: "Bob",
				score: 250,
			});
			expect(result[1]).toEqual({
				playerId: "p1",
				playerName: "Alice",
				score: 100,
			});
			expect(result[2]).toEqual({
				playerId: "p3",
				playerName: "Charlie",
				score: 50,
			});
		});

		it("should use playerId as playerName when not provided", () => {
			const scores = { p1: 100 };
			const playerNames = {};

			const result = party.createScoreboard(scores, playerNames) as Array<{
				playerId: string;
				playerName: string;
				score: number;
			}>;

			expect(result[0].playerName).toBe("p1");
		});

		it("should return empty array for empty scores", () => {
			const result = party.createScoreboard({}, {});
			expect(result).toEqual([]);
		});
	});

	describe("createMatchups", () => {
		it("should create round-robin matchups", () => {
			const playerIds = ["p1", "p2", "p3"];
			const items = [
				{ id: "i1", text: "Prompt 1" },
				{ id: "i2", text: "Prompt 2" },
				{ id: "i3", text: "Prompt 3" },
			];

			const result = party.createMatchups(playerIds, items) as Array<{
				playerA: string;
				playerB: string;
				item: { id: string; text: string };
			}>;

			expect(result).toHaveLength(3);
			// p1 paired with p2, p2 with p3, p3 with p1 (wrap-around)
			expect(result[0]).toEqual({
				playerA: "p1",
				playerB: "p2",
				item: items[0],
			});
			expect(result[1]).toEqual({
				playerA: "p2",
				playerB: "p3",
				item: items[1],
			});
			expect(result[2]).toEqual({
				playerA: "p3",
				playerB: "p1",
				item: items[2],
			});
		});

		it("should handle single player", () => {
			const result = party.createMatchups(["p1"], [{ id: "i1" }]) as Array<{
				playerA: string;
				playerB: string;
			}>;
			expect(result).toHaveLength(1);
			expect(result[0].playerA).toBe("p1");
			expect(result[0].playerB).toBe("p1"); // Wraps to self
		});
	});

	describe("tallyVotes", () => {
		it("should count votes for each choice", () => {
			const responses = {
				v1: { value: "choiceA" },
				v2: { value: "choiceA" },
				v3: { value: "choiceB" },
			};
			const authorMap = { choiceA: "p1", choiceB: "p2" };

			const result = party.tallyVotes(responses, false, authorMap) as Record<
				string,
				number
			>;

			expect(result.choiceA).toBe(2);
			expect(result.choiceB).toBe(1);
		});

		it("should exclude self-votes when excludeSelf is true", () => {
			const responses = {
				p1: { value: "choiceA" }, // p1 voting for their own answer
				p2: { value: "choiceA" },
				p3: { value: "choiceB" },
			};
			const authorMap = { choiceA: "p1", choiceB: "p2" };

			const result = party.tallyVotes(responses, true, authorMap) as Record<
				string,
				number
			>;

			// p1's vote for choiceA should be excluded
			expect(result.choiceA).toBe(1);
			expect(result.choiceB).toBe(1);
		});

		it("should not exclude self-votes when excludeSelf is false", () => {
			const responses = {
				p1: { value: "choiceA" },
				p2: { value: "choiceA" },
			};
			const authorMap = { choiceA: "p1" };

			const result = party.tallyVotes(responses, false, authorMap) as Record<
				string,
				number
			>;

			expect(result.choiceA).toBe(2);
		});
	});

	describe("calculatePoints", () => {
		it("should calculate points proportionally", () => {
			const voteCounts = { choiceA: 3, choiceB: 1 };
			const opts = {
				basePoints: 1000,
				roundMultiplier: 1,
				cleanSweepMultiplier: 1.25,
			};

			const result = party.calculatePoints(voteCounts, opts) as Record<
				string,
				number
			>;

			// choiceA: 3/4 * 1000 = 750
			// choiceB: 1/4 * 1000 = 250
			expect(result.choiceA).toBe(750);
			expect(result.choiceB).toBe(250);
		});

		it("should apply round multiplier", () => {
			const voteCounts = { choiceA: 2, choiceB: 1 };
			const opts = {
				basePoints: 1000,
				roundMultiplier: 2,
				cleanSweepMultiplier: 1.25,
			};

			const result = party.calculatePoints(voteCounts, opts) as Record<
				string,
				number
			>;

			// choiceA: 2/3 * 1000 * 2 = 1333 (no clean sweep, not all votes)
			// choiceB: 1/3 * 1000 * 2 = 667
			expect(result.choiceA).toBe(1333);
			expect(result.choiceB).toBe(667);
		});

		it("should apply clean sweep bonus when one choice gets all votes", () => {
			const voteCounts = { choiceA: 4, choiceB: 0 };
			const opts = {
				basePoints: 1000,
				roundMultiplier: 1,
				cleanSweepMultiplier: 1.5,
			};

			const result = party.calculatePoints(voteCounts, opts) as Record<
				string,
				number
			>;

			// choiceA: 4/4 * 1000 = 1000, then * 1.5 = 1500 (clean sweep)
			// choiceB: 0/4 * 1000 = 0 (no clean sweep since 0 votes)
			expect(result.choiceA).toBe(1500);
			expect(result.choiceB).toBe(0);
		});

		it("should return 0 points when no votes", () => {
			const result = party.calculatePoints({}, { basePoints: 1000 }) as Record<
				string,
				number
			>;
			expect(Object.keys(result)).toHaveLength(0);
		});

		it("should use default values for missing opts", () => {
			const voteCounts = { choiceA: 2, choiceB: 1 };
			const result = party.calculatePoints(voteCounts, {}) as Record<
				string,
				number
			>;

			// choiceA: 2/3 * 100 * 1 = 67 (no clean sweep)
			// choiceB: 1/3 * 100 * 1 = 33
			expect(result.choiceA).toBe(67);
			expect(result.choiceB).toBe(33);
		});
	});
});
