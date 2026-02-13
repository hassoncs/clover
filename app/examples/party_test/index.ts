import type { GameDefinition } from "@slopcade/shared";
import definition from "./definition.json";

export const metadata = {
	title: "Party: Question & Answer",
	description:
		"A multiplayer party game where players answer fun questions. Tests the full party stack end-to-end.",
	category: "party" as const,
	players: "1-8" as const,
};

export const gameDefinition: GameDefinition = definition as GameDefinition;

export default gameDefinition;
