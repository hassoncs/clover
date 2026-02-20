import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

function resp(playerId: string, value: unknown): PartyInputResponse {
	return { playerId, value, timestamp: Date.now() };
}

describe("heads-up template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through gameplay and emits heads-up phases", async () => {
		let actionCalls = 0;

		const room = createTemplateTestRoom(
			["p1", "p2", "p3"],
			(requestId: string, request: PartyInputRequest, players: string[]) => {
				const map = new Map<string, PartyInputResponse>();

				if (request.type === "buzzer") {
					for (const pid of players) map.set(pid, resp(pid, true));
					return map;
				}

				if (requestId.startsWith("round-action-")) {
					actionCalls++;
					if (actionCalls > 3) {
						vi.advanceTimersByTime(120_000);
						return map;
					}
					for (const pid of players) map.set(pid, resp(pid, 0));
					vi.advanceTimersByTime(5_000);
					return map;
				}

				for (const pid of players) map.set(pid, resp(pid, 0));
				return map;
			},
		);

		const registry = createTemplateRegistry();
		const runPromise = registry["heads-up"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("guessing")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
