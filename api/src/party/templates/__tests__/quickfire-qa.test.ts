import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{
			id: "q1",
			question: "What color is the sky on a clear day?",
			correctAnswer: "Blue",
			incorrectAnswers: ["Green", "Orange", "Black"],
		},
		{
			id: "q2",
			question: "How many sides does a triangle have?",
			correctAnswer: "3",
			incorrectAnswers: ["2", "4", "5"],
		},
	]),
}));

describe("quickfire-qa template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through quickfire gameplay and emits qa phases", async () => {
		expect(TEMPLATE_REGISTRY["quickfire-qa"]).toBeTypeOf("function");

		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["quickfire-qa"](room as never);
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
