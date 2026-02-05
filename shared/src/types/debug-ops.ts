import type { WorldOps } from './world-ops';

export interface TimeState {
  paused: boolean;
  timeScale: number;
  frame: number;
  elapsed: number;
}

export interface ShapeInfo {
  type: 'circle' | 'box' | 'capsule' | 'polygon';
  isSensor: boolean;
  offset: { x: number; y: number };
  radius?: number;
  halfExtents?: { x: number; y: number };
  height?: number;
  vertices?: Array<{ x: number; y: number }>;
}

export interface JointInfo {
  id: string;
  type: 'revolute' | 'prismatic' | 'distance' | 'weld' | 'rope';
  entityA: string;
  entityB: string;
  anchorA: { x: number; y: number };
  anchorB: { x: number; y: number };
}

export interface GameEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface DebugOps extends WorldOps {
  // --- Time Control ---
  pause(): Promise<void>;
  resume(): Promise<void>;
  step(frames?: number): Promise<void>;
  getTimeState(): Promise<TimeState>;
  setTimeScale(scale: number): Promise<void>;

  // --- Inspection ---
  screenshot(): Promise<string>;
  getEntityProps(entityId: string, paths: string[]): Promise<Record<string, unknown>>;
  setEntityProps(entityId: string, values: Record<string, unknown>): Promise<void>;
  getAllEntityProps(entityId: string): Promise<Record<string, unknown>>;

  // --- Advanced Queries ---
  queryCss(selector: string): Promise<string[]>;
  getShapes(entityId: string): Promise<ShapeInfo[]>;
  getJoints(entityId?: string): Promise<JointInfo[]>;
  getOverlaps(entityId: string): Promise<string[]>;

  // --- Event Subscriptions ---
  subscribe(eventType: string, selector?: string): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  pollEvents(subscriptionId?: string): Promise<GameEvent[]>;
}
