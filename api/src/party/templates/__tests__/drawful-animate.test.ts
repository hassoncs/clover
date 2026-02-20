import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("drawful-animate registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs drawful-animate through winner and end", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const registry = createTemplateRegistry();
		const runPromise = registry["drawful-animate"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();

		expect(emittedPhases.has("drawing_f1")).toBe(true);
		expect(emittedPhases.has("drawing_f2")).toBe(true);
		expect(emittedPhases.has("bluffing")).toBe(true);
		expect(emittedPhases.has("voting")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
