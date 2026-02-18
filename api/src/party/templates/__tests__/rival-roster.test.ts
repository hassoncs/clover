import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("rival-roster registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through battles to winner and end", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3", "p4"]);

		const runPromise = TEMPLATE_REGISTRY["rival-roster"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases).toContain("playing");
		expect(room.phases).toContain("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("champion_phase")).toBe(true);
		expect(emittedPhases.has("challenger_phase")).toBe(true);
		expect(emittedPhases.has("battle_reveal")).toBe(true);
		expect(emittedPhases.has("voting")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
