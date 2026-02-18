import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as promptLoader from "../../content/prompt-loader";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{ id: "d1", prompt: "A haunted toaster" },
		{ id: "d2", prompt: "A ghost with a smartphone" },
		{ id: "d3", prompt: "A penguin in a suit" },
		{ id: "d4", prompt: "A dinosaur at tea time" },
	]),
}));

describe("sketch-bluff registry runner", () => {
	beforeEach(() => {
		vi.mocked(promptLoader.loadContentPack).mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs sketch-bluff through all expected phases", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["sketch-bluff"](room as never);
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
