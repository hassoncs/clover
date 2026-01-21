import type { Physics2D } from '../physics2d/Physics2D';
import type { Vec2 } from '../physics2d/types';
import type { RuntimeEntity } from './types';
import type { EntityManager } from './EntityManager';

export interface InputState {
  tap?: { x: number; y: number; worldX: number; worldY: number };
  drag?: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
  };
  dragEnd?: {
    velocityX: number;
    velocityY: number;
    worldVelocityX: number;
    worldVelocityY: number;
  };
  tilt?: { x: number; y: number };
  buttons?: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    action: boolean;
  };
}

export interface GameState {
  score: number;
  lives: number;
  time: number;
  state: 'loading' | 'ready' | 'playing' | 'paused' | 'won' | 'lost';
}

export interface CollisionInfo {
  entityA: RuntimeEntity;
  entityB: RuntimeEntity;
  normal: Vec2;
  impulse: number;
}

export interface BehaviorContext {
  entity: RuntimeEntity;
  dt: number;
  elapsed: number;
  input: InputState;
  gameState: GameState;
  entityManager: EntityManager;
  physics: Physics2D;
  collisions: CollisionInfo[];
  pixelsPerMeter: number;

  addScore(points: number): void;
  setGameState(state: GameState['state']): void;
  spawnEntity(templateId: string, x: number, y: number): RuntimeEntity | null;
  destroyEntity(entityId: string): void;
  triggerEvent(eventName: string, data?: Record<string, unknown>): void;
}
