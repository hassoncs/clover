import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

				if (requestId.startsWith("answers-r")) {
					const answersByPlayer: Record<string, Record<number, string>> = {
						p1: { 0: "A1", 1: "A2", 2: "A3" },
						p2: { 0: "B1", 1: "B2", 2: "B3" },
						p3: { 0: "C1", 1: "C2", 2: "C3" },
					};

					return new Map(
						players.map((playerId) => [
							playerId,
							response(playerId, JSON.stringify(answersByPlayer[playerId])),
						]),
					);
				}

				if (requestId.startsWith("vote-r")) {
					return new Map(
						players.map((playerId) => [playerId, response(playerId, "0")]),
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

describe("quiplash registry runner (R2)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs the server script from definition through winner and end", async () => {
		const room = createRoom();

		const runPromise = TEMPLATE_REGISTRY.quiplash(room as never);
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
