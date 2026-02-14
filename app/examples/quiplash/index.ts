import type { GameDefinition } from "@slopcade/shared";
import definition from "./definition.json";

export const metadata = {
	title: "Quiplash",
	description:
		"Fill-in-the-blank comedy game. Players submit funny answers, then vote head-to-head!",
	category: "party" as const,
	players: "3-8" as const,
};

export const gameDefinition: GameDefinition = definition as GameDefinition;

export default gameDefinition;
