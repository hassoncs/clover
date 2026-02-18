import type React from "react";
import type { PartyRoomState } from "./types";
import type { ActiveInputRequest } from "./usePartyConnection";

export type PhaseRendererProps = {
	roomState: PartyRoomState;
	sharedData: Record<string, unknown>;
	activeInputRequest: ActiveInputRequest | null;
	sendInput: (value: unknown) => void;
	role: "host" | "player";
};

export type PhaseRenderer = React.ComponentType<PhaseRendererProps>;

export type PhaseRegistryEntry = Record<string, PhaseRenderer>; // phase name → component

const registry: Record<string, PhaseRegistryEntry> = {};

export function registerGamePhases(
	gameTemplate: string,
	phases: PhaseRegistryEntry,
) {
	registry[gameTemplate] = {
		...registry[gameTemplate],
		...phases,
	};
}

export function getPhaseRenderer(
	gameTemplate: string,
	phase: string,
): PhaseRenderer | null {
	const gameRegistry = registry[gameTemplate] || registry["default"];
	if (!gameRegistry) return null;
	return gameRegistry[phase] || null;
}
