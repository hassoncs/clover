import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{
			id: "pf-1",
			template: "Why did the [BLANK] cross the road?",
			blankPosition: 0,
		},
		{
			id: "pf-2",
			template: "A [BLANK] walks into a bar...",
			blankPosition: 0,
		},
		{
			id: "pf-3",
			template: "How many [BLANK] does it take to change a lightbulb?",
			blankPosition: 0,
		},
	]),
}));

describe("punchline-ferry template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs full collaborative joke flow through winner", async () => {
		expect(TEMPLATE_REGISTRY["punchline-ferry"]).toBeTypeOf("function");

		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["punchline-ferry"](room as never);
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
