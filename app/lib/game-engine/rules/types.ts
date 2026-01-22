import type { EntityManager } from '../EntityManager';
import type { CollisionInfo, GameState, InputState, InputEvents } from '../BehaviorContext';
import type { ComputedValueSystem, EvalContext } from '@slopcade/shared';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { RuntimeEntity } from '../types';

export interface IGameStateMutator {
  addScore(points: number): void;
  setScore(value: number): void;
  addLives(count: number): void;
  setLives(value: number): void;
  setGameState(state: GameState['state']): void;
  triggerEvent(name: string, data?: unknown): void;
  setVariable(name: string, value: number | string | boolean): void;
  getVariable(name: string): number | string | boolean | undefined;
  setCooldown(id: string, time: number): void;
}

export interface RuleContext {

  entityManager: EntityManager;
  physics: Physics2D;
  mutator: IGameStateMutator;
  score: number;
  lives: number;
  elapsed: number;
  collisions: CollisionInfo[];
  events: Map<string, unknown>;
  input: InputState;
  inputEvents: InputEvents;
  computedValues?: ComputedValueSystem;
  evalContext?: EvalContext;
  currentEntity?: RuntimeEntity;
  otherEntity?: RuntimeEntity;
  screenBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}
