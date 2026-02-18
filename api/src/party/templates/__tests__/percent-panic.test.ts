import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{
			question: "What percentage of people are left-handed?",
			percentage: 10,
			source: "Mock Census",
		},
		{
			question: "What percentage of Earth is covered by water?",
			percentage: 71,
			source: "Mock NASA",
		},
	]),
}));

import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("percent-panic registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through percent panic phases and ends", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["percent-panic"](room as never);
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
