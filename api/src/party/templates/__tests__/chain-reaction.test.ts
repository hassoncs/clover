import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPLATE_REGISTRY } from "../registry";
import { createTemplateTestRoom } from "./test-helpers";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{ id: "w1", text: "Atom" },
		{ id: "w2", text: "Electron" },
		{ id: "w3", text: "Gravity" },
		{ id: "w4", text: "Energy" },
	]),
}));

describe("chain-reaction template runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs through gameplay and emits core chain-reaction phases", async () => {
		const room = createTemplateTestRoom(["p1", "p2", "p3"]);

		const runPromise = TEMPLATE_REGISTRY["chain-reaction"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = room.emittedPhases();
		expect(emittedPhases.has("round_start")).toBe(true);
		expect(emittedPhases.has("reaction")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
