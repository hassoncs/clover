import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("spectrum-guess template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through all spectrum-guess phases and ends", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const registry = createTemplateRegistry();
		const runPromise = registry["spectrum-guess"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("calibration")).toBe(true);
		expect(emittedPhases.has("guessing")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
