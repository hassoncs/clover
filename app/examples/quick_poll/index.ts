import type { GameDefinition } from "@slopcade/shared";
import definition from "./definition.json";

export const metadata = {
	title: "Party: Quick Poll",
	description:
		"A simple multiplayer polling game. Host starts a poll, players vote.",
	category: "party" as const,
	players: "1-10" as const,
};

export const gameDefinition: GameDefinition = definition as GameDefinition;

export default gameDefinition;
