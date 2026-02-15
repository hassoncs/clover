import { describe, expect, it, vi } from "vitest";
import {
	type ServerScriptRoom,
	ServerScriptRunner,
} from "../ServerScriptRunner";

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

describe("ServerScriptRunner", () => {
	it("executes a basic script against room API", async () => {
		const room = createMockRoom();
		const runner = new ServerScriptRunner(room);

		await runner.execute(`
      room.setPhase("playing");
      room.updateSharedData({ started: true });
    `);

		expect(room.setPhase).toHaveBeenCalledWith("playing");
		expect(room.updateSharedData).toHaveBeenCalledWith({ started: true });
	});

	it("supports requiring slopcade modules", async () => {
		const room = createMockRoom();
		const runner = new ServerScriptRunner(room);

		await runner.execute(`
      const party = require("slopcade/party");
      exports.run = async function(room) {
        const scoreboard = party.createScoreboard(
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
		const runner = new ServerScriptRunner(room);

		await expect(
			runner.execute(`
        throw new Error("script failed hard");
      `),
		).rejects.toThrow("script failed hard");
	});

	it("executes async exports.run with config", async () => {
		const room = createMockRoom();
		const runner = new ServerScriptRunner(room);

		await runner.execute(
			`
      exports.run = async function(room, config) {
        const players = room.getPlayers();
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
});
