import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";
import { vi } from "vitest";

type InputMap = Map<string, PartyInputResponse>;
type InputResponder = (
	requestId: string,
	request: PartyInputRequest,
	players: string[],
) => InputMap;

function response(playerId: string, value: unknown): PartyInputResponse {
	return { playerId, value, timestamp: Date.now() };
}

function defaultResponder(
	_requestId: string,
	request: PartyInputRequest,
	players: string[],
): InputMap {
	const map = new Map<string, PartyInputResponse>();
	for (const pid of players) {
		let value: unknown = true;
		if (request.type === "text") value = "test answer";
		if (request.type === "choice") value = 0;
		if (request.type === "drawing") value = "data:image/png;base64,test";
		if (request.type === "mic")
			value = { transcript: "test audio", audioBlobId: null };
		map.set(pid, response(pid, value));
	}
	return map;
}

export function createTemplateTestRoom(
	players = ["p1", "p2", "p3"],
	responder: InputResponder = defaultResponder,
) {
	const phases: string[] = [];
	const updates: Array<Record<string, unknown>> = [];

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
				request: PartyInputRequest,
			): Promise<InputMap> => {
				return responder(requestId, request, players);
			},
		),
		requestInputFromSubset: vi.fn(
			async (
				requestId: string,
				request: PartyInputRequest,
				subset: string[],
			): Promise<InputMap> => {
				return responder(requestId, request, subset);
			},
		),
		sendToPlayer: vi.fn(async () => undefined),
		updatePlayerScore: vi.fn(async () => undefined),
		getPlayer: vi.fn(async (id: string) => ({ name: id, id })),
		getPlayers: vi.fn(() => players),
		delay: vi.fn(async () => undefined),
		phases,
		updates,
		emittedPhases(): Set<string> {
			return new Set(
				updates
					.map((u) => (u.phase ?? u.qaPhase) as string | undefined)
					.filter((p): p is string => typeof p === "string"),
			);
		},
		lastUpdate(): Record<string, unknown> {
			return updates[updates.length - 1] ?? {};
		},
	};
}
