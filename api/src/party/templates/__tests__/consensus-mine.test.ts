import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => []),
}));

import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("consensus-mine template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through survey, team_turns, winner, then ends", async () => {
		let pickTurn = 0;
		const room = createTemplateTestRoom(
			["p1", "p2", "p3", "p4"],
			(requestId, request, players) => {
				const responses = new Map();

				for (const playerId of players) {
					let value: unknown = true;

					if (request.type === "choice") {
						if (requestId === "survey") {
							value = [0, 1, 2, 3, 4, 5, 6, 7];
						} else if (requestId === "pick") {
							value = pickTurn % 3;
						} else {
							value = 0;
						}
					}

					responses.set(playerId, {
						playerId,
						value,
						timestamp: Date.now(),
					});
				}

				if (requestId === "pick") {
					pickTurn += 1;
				}

				return responses;
			},
		);

		const runPromise = TEMPLATE_REGISTRY["consensus-mine"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("survey")).toBe(true);
		expect(emittedPhases.has("team_turns")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
