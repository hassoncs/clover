export {
	cellKey,
	cellToWorld as gridCellToWorld,
	createGridConfig,
	type GridConfig,
	gridConfigFromMatch3,
	isAdjacent as gridIsAdjacent,
	isValidCell,
	parseCellKey,
	worldToCell as gridWorldToCell,
} from "./grid/helpers";
export {
	type CellPosition,
	findConnectedGroups,
	findLineMatches,
	floodFill,
	getHexNeighbors,
	getNeighbors,
	type LineMatch,
} from "./grid/match-utils";
export * from "./grid/types";
export {
	type Alignment,
	type CircularLayoutConfig,
	type ColumnLayoutConfig,
	distributeCircular,
	distributeColumn,
	distributeGrid,
	distributeRow,
	type GridLayoutConfig,
	type GridPosition,
	getColumnY,
	getGridPosition,
	getRowX,
	type LayoutPosition,
	type RowLayoutConfig,
} from "./layout";
export * from "./slots";
export * from "./types";

import { gridSystem } from "./grid";
import type { ExpressionFunction } from "./types";

export { gridSystem };

const ALL_SYSTEMS = [gridSystem];

let cachedFunctions: Record<string, ExpressionFunction> | null = null;

export function getAllSystemExpressionFunctions(): Record<
	string,
	ExpressionFunction
> {
	if (cachedFunctions) return cachedFunctions;

	const functions: Record<string, ExpressionFunction> = {};
	for (const system of ALL_SYSTEMS) {
		if (system.expressionFunctions) {
			Object.assign(functions, system.expressionFunctions);
		}
	}
	cachedFunctions = functions;
	return functions;
}
