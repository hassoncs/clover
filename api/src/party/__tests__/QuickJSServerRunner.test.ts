import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	QuickJSServerRunner,
	type ServerScriptRoom,
} from "../QuickJSServerRunner";

function createMockRoom(): ServerScriptRoom {
	return {
		setPhase: vi.fn(async () => undefined),
		updateSharedData: vi.fn(async () => undefined),
		requestInput: vi.fn(async () => new Map()),
		requestInputFromSubset: vi.fn(async () => new Map()),
		sendToPlayer: vi.fn(async () => undefined),
		updatePlayerScore: vi.fn(async () => undefined),
		getPlayers: vi.fn(() => ["p1", "p2"]),
	};
}

describe("QuickJSServerRunner", () => {
	it("executes a basic script against room API", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		await runner.execute(`
      room.setPhase("playing");
      room.updateSharedData({ started: true });
    `);

		expect(room.setPhase).toHaveBeenCalledWith("playing");
		expect(room.updateSharedData).toHaveBeenCalledWith({ started: true });
	});

	it("supports requiring slopcade modules", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		await runner.execute(`
      var party = require("slopcade/party");
      exports.run = async function(room) {
        var scoreboard = party.createScoreboard(
          { p1: 5, p2: 10 },
          { p1: "Alice", p2: "Bob" }
        );
        await room.updateSharedData({ leaderId: scoreboard[0].playerId });
      };
    `);

		expect(room.updateSharedData).toHaveBeenCalledWith({ leaderId: "p2" });
	});

	it("surfaces script errors to caller", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		await expect(
			runner.execute(`
        throw new Error("script failed hard");
      `),
		).rejects.toThrow("script failed hard");
	});

	it("executes async exports.run with config", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		await runner.execute(
			`
      exports.run = async function(room, config) {
        var players = room.getPlayers();
        await room.updateSharedData({
          playerCount: players.length,
          contentCount: Array.isArray(config.contentPack) ? config.contentPack.length : 0,
        });
      };
    `,
			{
				contentPack: [{ id: "a" }, { id: "b" }],
			},
		);

		expect(room.getPlayers).toHaveBeenCalled();
		expect(room.updateSharedData).toHaveBeenCalledWith({
			playerCount: 2,
			contentCount: 2,
		});
	});

	it("handles async room API calls correctly", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		await runner.execute(`
      exports.run = async function(room) {
        await room.setPhase("playing");
        await room.updateSharedData({ phase: "playing" });
        await room.delay(10);
        await room.setPhase("ended");
      };
    `);

		expect(room.setPhase).toHaveBeenCalledTimes(2);
		expect(room.updateSharedData).toHaveBeenCalled();
	});

	it("handles async function returning string", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		room.requestInputFromSubset = vi.fn(async () => {
			return "sunset" as unknown as Map<string, never>;
		});

		await runner.execute(`
      exports.run = async function(room) {
        var result = await room.requestInputFromSubset("clue", {}, ["p1"]);
        await room.updateSharedData({ clue: result });
      };
    `);

		expect(room.updateSharedData).toHaveBeenCalledWith({ clue: "sunset" });
	});

	it("handles async function returning number", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		room.requestInputFromSubset = vi.fn(async () => {
			return 42 as unknown as Map<string, never>;
		});

		await runner.execute(`
      exports.run = async function(room) {
        var result = await room.requestInputFromSubset("test", {}, ["p1"]);
        await room.updateSharedData({ value: result });
      };
    `);

		expect(room.updateSharedData).toHaveBeenCalledWith({ value: 42 });
	});

	it("handles requestInputFromSubset returning object with nested object", async () => {
		const room = createMockRoom();
		const runner = new QuickJSServerRunner(room);

		room.requestInputFromSubset = vi.fn(async () => {
			const map = new Map();
			map.set("p1", { value: "sunset" });
			return map;
		});

		await runner.execute(`
      exports.run = async function(room) {
        var responses = await room.requestInputFromSubset("clue", {}, ["p1"]);
        var clueText = responses["p1"] ? responses["p1"].value : "color";
        await room.updateSharedData({ clue: clueText });
      };
    `);

		expect(room.updateSharedData).toHaveBeenCalledWith({ clue: "sunset" });
	});

	describe("timeout", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
		});

		it.skip("throws timeout error when script exceeds 30 minutes", async () => {
			const room = createMockRoom();
			const runner = new QuickJSServerRunner(room);

			room.requestInput = vi.fn(async () => {
				await new Promise(() => {});
				return new Map();
			});

			const executePromise = runner.execute(`
        exports.run = async function(room) {
          await room.requestInput("stuck", { type: "text", prompt: "Never responds" });
        };
      `);

			const timerPromise = vi.advanceTimersByTimeAsync(30 * 60 * 1000);
			await expect(executePromise).rejects.toThrow("Script execution timeout");
			await timerPromise;
		});

		it("completes normally when script finishes before timeout", async () => {
			const room = createMockRoom();
			const runner = new QuickJSServerRunner(room);

			const executePromise = runner.execute(`
        exports.run = async function(room) {
          await room.setPhase("playing");
        };
      `);

			const timerPromise = vi.advanceTimersByTimeAsync(1000);
			await expect(executePromise).resolves.toBeUndefined();
			await timerPromise;
			expect(room.setPhase).toHaveBeenCalledWith("playing");
		});
	});
});
