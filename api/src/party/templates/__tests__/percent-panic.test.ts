import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("percent-panic registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through percent panic phases and ends", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const registry = createTemplateRegistry();
		const runPromise = registry["percent-panic"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases).toContain("playing");
		expect(room.phases).toContain("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("agent_guess")).toBe(true);
		expect(emittedPhases.has("group_bet")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
