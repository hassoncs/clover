import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as promptLoader from "../../content/prompt-loader";

vi.mock("../../content/prompt-loader", () => ({
	loadContentPack: vi.fn(() => [
		{ id: "q1", text: "Prompt 1" },
		{ id: "q2", text: "Prompt 2" },
		{ id: "q3", text: "Prompt 3" },
		{ id: "q4", text: "Prompt 4" },
		{ id: "q5", text: "Prompt 5" },
	]),
}));

import { TEMPLATE_REGISTRY } from "../registry";

type InputMap = Map<string, PartyInputResponse>;

function response(playerId: string, value: unknown): PartyInputResponse {
	return { playerId, value, timestamp: Date.now() };
}

function createRoom() {
	const phases: string[] = [];
	const updates: Array<Record<string, unknown>> = [];

	const players = ["p1", "p2", "p3"];

	return {
		setPhase: vi.fn(async (phase: string) => {
			phases.push(phase);
		}),
		updateSharedData: vi.fn(async (data: Record<string, unknown>) => {
			updates.push(data);
		}),
		requestInput: vi.fn(
			async (
				requestId: string,
				_request: PartyInputRequest,
			): Promise<InputMap> => {
				if (requestId === "ready-check") {
					return new Map(
						players.map((playerId) => [playerId, response(playerId, true)]),
					);
				}

				if (requestId.startsWith("answer-r")) {
					return new Map(
						players.map((playerId) => [
							playerId,
							response(
								playerId,
								JSON.stringify({ "p-0": "Answer 1", "p-1": "Answer 2" }),
							),
						]),
					);
				}

				if (requestId === "answer-finale") {
					return new Map(
						players.map((playerId) => [
							playerId,
							response(playerId, "Finale Answer"),
						]),
					);
				}

				if (requestId.startsWith("vote-r") || requestId === "vote-finale") {
					return new Map(
						players.map((playerId) => [playerId, response(playerId, "a1")]),
					);
				}

				return new Map();
			},
		),
		requestInputFromSubset: vi.fn(async () => new Map()),
		sendToPlayer: vi.fn(async () => undefined),
		updatePlayerScore: vi.fn(async () => undefined),
		getPlayers: vi.fn(() => players),
		phases,
		updates,
	};
}

describe("punchline-duel registry runner", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs the punchline-duel server script through winner and end", async () => {
		const room = createRoom();

		const runPromise = TEMPLATE_REGISTRY["punchline-duel"](room as never);
		await vi.runAllTimersAsync();
		await runPromise;

		expect(room.phases[0]).toBe("playing");
		expect(room.phases[room.phases.length - 1]).toBe("ended");

		const emittedPhases = new Set(
			room.updates
				.map((update) => update.phase)
				.filter((phase): phase is string => typeof phase === "string"),
		);

		expect(emittedPhases.has("answering")).toBe(true);
		expect(emittedPhases.has("voting")).toBe(true);
		expect(emittedPhases.has("reveal")).toBe(true);
		expect(emittedPhases.has("scores")).toBe(true);
		expect(emittedPhases.has("winner")).toBe(true);
	});
});
