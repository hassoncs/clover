import type { ActionExecutor } from './ActionExecutor';
import type { GridMoveAction, GridPlaceAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

type GridAction = GridMoveAction | GridPlaceAction;

interface GridStateData {
  cells: Record<string, string | null>;
  entityPositions: Record<string, { row: number; col: number }>;
}

export class GridActionExecutor implements ActionExecutor<GridAction> {
  execute(action: GridAction, context: RuleContext): void {
    switch (action.type) {
      case 'grid_move': this.executeMove(action, context); break;
      case 'grid_place': this.executePlace(action, context); break;
    }
  }

  private getGridState(gridId: string, context: RuleContext): GridStateData {
    const stateKey = '__gridStates';
    let states = context.mutator.getVariable(stateKey) as unknown as Record<string, GridStateData> | undefined;
    if (!states) states = {};
    if (!states[gridId]) states[gridId] = { cells: {}, entityPositions: {} };
    return states[gridId];
  }

  private saveGridState(gridId: string, state: GridStateData, context: RuleContext): void {
    const stateKey = '__gridStates';
    let states = context.mutator.getVariable(stateKey) as unknown as Record<string, GridStateData> | undefined;
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
    const entityId = typeof action.entityId === 'string' 
      ? action.entityId 
      : resolveEntityTarget(action.entityId, context)[0]?.id;
    if (!entityId) return;
    
    const entity = context.entityManager.getEntity(entityId);
    if (!entity) return;
    
    const state = this.getGridState(action.gridId, context);
    const oldPos = state.entityPositions[entityId];
    const newRow = resolveNumber(action.toRow, context);
    const newCol = resolveNumber(action.toCol, context);
    
    if (oldPos) {
      delete state.cells[`${oldPos.row},${oldPos.col}`];
    }
    state.cells[`${newRow},${newCol}`] = entityId;
    state.entityPositions[entityId] = { row: newRow, col: newCol };
    
    const worldPos = this.cellToWorld(newRow, newCol);
    entity.transform.x = worldPos.x;
    entity.transform.y = worldPos.y;
    this.saveGridState(action.gridId, state, context);
  }

  private executePlace(action: GridPlaceAction, context: RuleContext): void {
    const entityId = typeof action.entityId === 'string' 
      ? action.entityId 
      : resolveEntityTarget(action.entityId, context)[0]?.id;
    if (!entityId) return;
    
    const entity = context.entityManager.getEntity(entityId);
    if (!entity) return;
    
    const state = this.getGridState(action.gridId, context);
    const row = resolveNumber(action.row, context);
    const col = resolveNumber(action.col, context);
    
    state.cells[`${row},${col}`] = entityId;
    state.entityPositions[entityId] = { row, col };
    
    const worldPos = this.cellToWorld(row, col);
    entity.transform.x = worldPos.x;
    entity.transform.y = worldPos.y;
    this.saveGridState(action.gridId, state, context);
  }
}
