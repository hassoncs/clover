import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("sketch-bluff registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs sketch-bluff through all expected phases", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const registry = createTemplateRegistry();
		const runPromise = registry["sketch-bluff"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases.includes("ended")).toBe(true);

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("drawing")).toBe(true);
		expect(emittedPhases.has("bluffing")).toBe(true);
		expect(emittedPhases.has("voting")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
