import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{ id: "a1", prompt: "A dancing cactus" },
		{ id: "a2", prompt: "A nervous penguin" },
		{ id: "a3", prompt: "A robot doing yoga" },
		{ id: "a4", prompt: "A cat stuck in a sweater" },
		{ id: "a5", prompt: "A wizard tripping over a broom" },
	]),
}));

import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

describe("drawful-animate registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs drawful-animate through winner and end", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["drawful-animate"](room as never);
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
