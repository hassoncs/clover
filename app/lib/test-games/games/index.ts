import type { GameDefinition } from "@slopcade/shared";

import { cubeWorld3D } from "./cube-world-3d";

export const testGames: Record<string, GameDefinition> = {
	"cube-world-3d": cubeWorld3D,
};

export { cubeWorld3D };
