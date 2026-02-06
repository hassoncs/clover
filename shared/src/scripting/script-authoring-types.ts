import type { SyncWorldOps } from '../types/sync-world-ops';
import type { AsyncWorldOps } from '../types/async-world-ops';
import type { Vec2 } from '../types/common';

export interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted';
  position?: Vec2;
  entityId?: string | null;
  timestamp: number;
}

export interface ScriptCollisionEvent {
  entityA: string;
  entityB: string;
  normal: Vec2;
  impulse: number;
  contactPoint: Vec2;
  timestamp: number;
}

export interface ScriptContext extends SyncWorldOps {
  worldAsync: AsyncWorldOps;
  readonly dt: number;
  readonly elapsed: number;
  readonly frameId: number;
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: readonly T[]): T;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  distance(a: Vec2, b: Vec2): number;
}

export type ScriptFunction<TArgs = Record<string, unknown>> =
  (ctx: ScriptContext, args?: TArgs) => unknown;
