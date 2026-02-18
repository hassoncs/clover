import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{ id: "p1", text: "What is {{player}} most likely to order at midnight?" },
		{ id: "p2", text: "What is {{player}}'s weirdest childhood hobby?" },
		{ id: "p3", text: "What food would {{player}} eat every day forever?" },
	]),
}));

import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("about-you-bluff template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through all phases and ends", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["about-you-bluff"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("truth_writing")).toBe(true);
		expect(emittedPhases.has("bluff_writing")).toBe(true);
		expect(emittedPhases.has("guessing")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
