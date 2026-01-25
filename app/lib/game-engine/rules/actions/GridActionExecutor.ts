import type { ActionExecutor } from './ActionExecutor';
import type { GridMoveAction, GridPlaceAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

type GridAction = GridMoveAction | GridPlaceAction;

export class GridActionExecutor implements ActionExecutor<GridAction> {
  execute(action: GridAction, context: RuleContext): void {
    switch (action.type) {
      case 'grid_move': this.executeMove(action, context); break;
      case 'grid_place': this.executePlace(action, context); break;
    }
  }

  private getGridState(gridId: string, context: RuleContext): { cells: Record<string, string | null>; entityPositions: Record<string, { row: number; col: number }> } {
    const stateKey = '__gridStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { cells: Record<string, string | null>; entityPositions: Record<string, { row: number; col: number }> }> | undefined;
    if (!states) states = {};
    if (!states[gridId]) states[gridId] = { cells: {}, entityPositions: {} };
    return states[gridId];
  }

  private saveGridState(gridId: string, state: { cells: Record<string, string | null>; entityPositions: Record<string, { row: number; col: number }> }, context: RuleContext): void {
    const stateKey = '__gridStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, typeof state> | undefined;
    if (!states) states = {};
    states[gridId] = state;
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private cellToWorld(row: number, col: number): { x: number; y: number } {
    const cellSize = 1;
    const origin = { x: -4, y: 4 };
    return { x: origin.x + col * cellSize + cellSize / 2, y: origin.y - row * cellSize - cellSize / 2 };
  }

  private executeMove(action: GridMoveAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    if (entities.length === 0) return;
    const entity = entities[0];
    const state = this.getGridState(action.gridId, context);
    const pos = state.entityPositions[entity.id] ?? { row: 0, col: 0 };
    let newRow = pos.row, newCol = pos.col;
    switch (action.direction) {
      case 'up': newRow -= 1; break;
      case 'down': newRow += 1; break;
      case 'left': newCol -= 1; break;
      case 'right': newCol += 1; break;
    }
    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) return;
    delete state.cells[`${pos.row},${pos.col}`];
    state.cells[`${newRow},${newCol}`] = entity.id;
    state.entityPositions[entity.id] = { row: newRow, col: newCol };
    const worldPos = this.cellToWorld(newRow, newCol);
    entity.transform.x = worldPos.x;
    entity.transform.y = worldPos.y;
    this.saveGridState(action.gridId, state, context);
  }

  private executePlace(action: GridPlaceAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    if (entities.length === 0) return;
    const entity = entities[0];
    const state = this.getGridState(action.gridId, context);
    const row = resolveNumber(action.row, context);
    const col = resolveNumber(action.col, context);
    state.cells[`${row},${col}`] = entity.id;
    state.entityPositions[entity.id] = { row, col };
    const worldPos = this.cellToWorld(row, col);
    entity.transform.x = worldPos.x;
    entity.transform.y = worldPos.y;
    this.saveGridState(action.gridId, state, context);
  }
}
