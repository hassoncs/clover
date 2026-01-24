import type { EntityManager } from '../EntityManager';
import type { InputEntityManager } from '../InputEntityManager';
import type { CollisionInfo, GameState, InputState, InputEvents } from '../BehaviorContext';
import type { ComputedValueSystem, EvalContext } from '@slopcade/shared';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { RuntimeEntity } from '../types';
import type { CameraSystem } from '../CameraSystem';

export type ListValue = (number | string | boolean)[];

export interface IGameStateMutator {
  addScore(points: number): void;
  setScore(value: number): void;
  getScore(): number;
  addLives(count: number): void;
  setLives(value: number): void;
  getLives(): number;
  getElapsed(): number;
  setGameState(state: GameState['state']): void;
  triggerEvent(name: string, data?: unknown): void;
  setVariable(name: string, value: number | string | boolean): void;
  getVariable(name: string): number | string | boolean | undefined;
  setCooldown(id: string, time: number): void;
  
  getList(name: string): ListValue | undefined;
  setList(name: string, value: ListValue): void;
  pushToList(name: string, value: number | string | boolean): void;
  popFromList(name: string, position: 'front' | 'back'): number | string | boolean | undefined;
  shuffleList(name: string, random?: () => number): void;
  listContains(name: string, value: number | string | boolean): boolean;
}

export interface RuleContext {
  entityManager: EntityManager;
  inputEntityManager?: InputEntityManager;
  physics: Physics2D;
  mutator: IGameStateMutator;
  camera?: CameraSystem;
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
  timeScale?: number;
  setTimeScale?: (scale: number, duration?: number) => void;
  playSound?: (soundId: string, volume?: number) => void;
}
