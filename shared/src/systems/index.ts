/**
 * Composable Game Systems
 * 
 * This module provides a registry for modular game systems that can be
 * added or removed without affecting the core engine. Each system:
 * 
 * 1. Registers its schema extensions (types)
 * 2. Registers its expression functions
 * 3. Registers its behaviors
 * 4. Registers its actions
 * 5. Declares its version for compatibility checking
 * 
 * Games declare which systems they use via `systems` in GameDefinition.
 * On load, the engine validates that all required systems are available
 * and their versions are compatible.
 */

export * from './GameSystemRegistry';
export * from './types';
export * from './combo/types';
export * from './checkpoint/types';
export * from './grid/types';
export {
  type GridConfig,
  createGridConfig,
  cellToWorld as gridCellToWorld,
  worldToCell as gridWorldToCell,
  isValidCell,
  isAdjacent as gridIsAdjacent,
  cellKey,
  parseCellKey,
  gridConfigFromMatch3,
} from './grid/helpers';
export { floodFill, getHexNeighbors, getNeighbors, findConnectedGroups, findLineMatches, type CellPosition, type LineMatch } from './grid/match-utils';
export * from './inventory/types';
export * from './progression/types';
export * from './state-machine/types';
export * from './wave/types';
export * from './path/types';
export * from './spatial-query/types';
export * from './dynamic-collider/types';
export * from './slots';

import { comboSystem } from './combo';
import { checkpointSystem } from './checkpoint';
import { gridSystem } from './grid';
import { inventorySystem } from './inventory';
import { progressionSystem } from './progression';
import { stateMachineSystem } from './state-machine';
import { waveSystem } from './wave';
import { pathSystem } from './path';
import { spatialQuerySystem } from './spatial-query';
import { dynamicColliderSystem } from './dynamic-collider';
import type { ExpressionFunction } from './types';

export {
  comboSystem,
  checkpointSystem,
  gridSystem,
  inventorySystem,
  progressionSystem,
  stateMachineSystem,
  waveSystem,
  pathSystem,
  spatialQuerySystem,
  dynamicColliderSystem,
};

const ALL_SYSTEMS = [
  comboSystem,
  checkpointSystem,
  gridSystem,
  inventorySystem,
  progressionSystem,
  stateMachineSystem,
  waveSystem,
  pathSystem,
  spatialQuerySystem,
  dynamicColliderSystem,
];

let cachedFunctions: Record<string, ExpressionFunction> | null = null;

export function getAllSystemExpressionFunctions(): Record<string, ExpressionFunction> {
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
