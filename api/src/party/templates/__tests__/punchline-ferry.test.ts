import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("punchline-ferry template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs full collaborative joke flow through winner", async () => {
		const registry = createTemplateRegistry();
		expect(registry["punchline-ferry"]).toBeTypeOf("function");

		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = registry["punchline-ferry"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("wordbank")).toBe(true);
		expect(emittedPhases.has("setup")).toBe(true);
		expect(emittedPhases.has("forcedword")).toBe(true);
		expect(emittedPhases.has("punchline")).toBe(true);
		expect(emittedPhases.has("theshow")).toBe(true);
		expect(emittedPhases.has("voting")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
