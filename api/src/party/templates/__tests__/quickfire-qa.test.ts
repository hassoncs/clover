import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./mock-content-pack";
import { createTemplateRegistry, createTemplateTestRoom } from "./test-helpers";

describe("quickfire-qa template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through quickfire gameplay and emits qa phases", async () => {
		const registry = createTemplateRegistry();
		expect(registry["quickfire-qa"]).toBeTypeOf("function");

		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = registry["quickfire-qa"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("question")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
	});
});
