import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("shirt-clash template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs shirt-clash through tournament and winner", async () => {
		expect(TEMPLATE_REGISTRY["shirt-clash"]).toBeTypeOf("function");

		const room = createTemplateTestRoom(["p1", "p2", "p3", "p4"]);

		const runPromise = TEMPLATE_REGISTRY["shirt-clash"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("creation")).toBe(true);
		expect(emittedPhases.has("assembly")).toBe(true);
		expect(emittedPhases.has("tournament_round")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
