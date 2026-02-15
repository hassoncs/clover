import type { GameDefinition } from "@slopcade/shared";
import { cubeWorld3D } from "../../test-games/games/cube-world-3d";
import type { TestGameMeta } from "../types";

export interface TestGameEntry {
	id: string;
	href: string;
	meta: TestGameMeta;
}

const cubeWorld3DMeta: TestGameMeta = {
	title: "Cube World 3D",
	description: "3D smoke test scene with dynamic cubes and floor",
	category: "physics-demo",
	status: "beta",
	tags: ["3d", "smoke-test", "physics"],
};

export const TESTGAMES: TestGameEntry[] = [
	{
		id: "cube-world-3d",
		href: "/test-games/cube-world-3d",
		meta: cubeWorld3DMeta,
	},
];

export const TESTGAMES_BY_ID: Record<string, TestGameEntry> = {};

export type TestGameId = "cube-world-3d";

export async function loadTestGame(id: string): Promise<GameDefinition | null> {
	if (id === "cube-world-3d") {
		return cubeWorld3D;
	}
	return null;
}

export function getTestGameComponent(_id: string): null {
	return null;
}
