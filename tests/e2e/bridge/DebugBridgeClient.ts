import type GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import type { TimeState, ShapeInfo, JointInfo, GameEvent } from "@slopcade/shared/types/debug-ops";
import type { GodotSceneSnapshot, GodotVec2 } from "@slopcade/shared/types/godot-bridge";

export interface QueryResult {
  matches: string[];
  count: number;
  hasMore: boolean;
  entities?: Array<{ id: string; [key: string]: unknown }>;
}

export interface PropPatchOp {
  op: "set" | "increment" | "multiply" | "append" | "remove";
  path: string;
  value?: unknown;
}

export interface BatchResult {
  success: boolean;
  results?: unknown[];
  errors?: string[];
}

export interface SpawnResult {
  ok: boolean;
  entityId?: string;
  error?: string;
}

export interface DestroyResult {
  ok: boolean;
  error?: string;
}

export interface CloneResult {
  ok: boolean;
  entityId?: string;
  error?: string;
}

export interface StepResult {
  ok: boolean;
  framesAdvanced?: number;
  error?: string;
}

export interface TimeScaleResult {
  ok: boolean;
  previousScale?: number;
  error?: string;
}

export interface SubscribeRequest {
  types?: string[];
  where?: Record<string, unknown>;
  limitPerPoll?: number;
}

export interface SubscribeResult {
  ok: boolean;
  subId?: string;
  error?: string;
}

export interface PollEventsResult {
  events: GameEvent[];
  count: number;
  dropped: number;
}

export class DebugBridgeClient {
  constructor(private driver: GodotHeadlessDriver) {}

  async getTimeState(): Promise<TimeState> {
    return this.driver.query<TimeState>("getTimeState");
  }

  async step(frames: number = 1): Promise<StepResult> {
    return this.driver.query<StepResult>("step", [frames]);
  }

  async setTimeScale(scale: number): Promise<TimeScaleResult> {
    return this.driver.query<TimeScaleResult>("setTimeScale", [scale]);
  }

  async setSeed(seed: number): Promise<{ ok: boolean; error?: string }> {
    return this.driver.query<{ ok: boolean; error?: string }>("setSeed", [seed]);
  }

  async getSceneSnapshot(): Promise<GodotSceneSnapshot> {
    return this.driver.query<GodotSceneSnapshot>("getSceneSnapshot");
  }

  async getEntityDetails(entityId: string): Promise<Record<string, unknown> | null> {
    return this.driver.query<Record<string, unknown> | null>("getEntityDetails", [entityId]);
  }

  async getEntityCount(): Promise<{ total: number; byTemplate: Record<string, number> }> {
    return this.driver.query<{ total: number; byTemplate: Record<string, number> }>("getEntityCount");
  }

  async findEntities(options?: { tag?: string; template?: string; limit?: number }): Promise<string[]> {
    return this.driver.query<string[]>("findEntities", options ? [options] : []);
  }

  async getEntitiesAtPoint(x: number, y: number): Promise<string[]> {
    return this.driver.query<string[]>("getEntitiesAtPoint", [x, y]);
  }

  async getEntitiesInRect(minX: number, minY: number, maxX: number, maxY: number): Promise<string[]> {
    return this.driver.query<string[]>("getEntitiesInRect", [minX, minY, maxX, maxY]);
  }

  async query(selector: string, options?: { limit?: number; offset?: number }): Promise<QueryResult> {
    return this.driver.query<QueryResult>("query", options ? [selector, options] : [selector]);
  }

  async getProps(entityId: string, paths: string[]): Promise<Record<string, unknown>> {
    return this.driver.query<Record<string, unknown>>("getProps", [entityId, paths]);
  }

  async getAllProps(entityId: string): Promise<Record<string, unknown>> {
    return this.driver.query<Record<string, unknown>>("getAllProps", [entityId]);
  }

  async setProps(entityId: string, values: Record<string, unknown>): Promise<{ ok: boolean; applied?: string[]; error?: string }> {
    return this.driver.query<{ ok: boolean; applied?: string[]; error?: string }>("setProps", [entityId, values]);
  }

  async patchProps(ops: PropPatchOp[]): Promise<BatchResult> {
    return this.driver.query<BatchResult>("patchProps", [ops]);
  }

  async spawn(templateId: string, x: number, y: number, options?: { entityId?: string; tags?: string[] }): Promise<SpawnResult> {
    const request = { templateId, x, y, ...options };
    return this.driver.query<SpawnResult>("spawn", [request]);
  }

  async destroy(entityId: string, options?: { recursive?: boolean }): Promise<DestroyResult> {
    return this.driver.query<DestroyResult>("destroy", options ? [entityId, options] : [entityId]);
  }

  async clone(entityId: string, options?: { position?: GodotVec2; withChildren?: boolean }): Promise<CloneResult> {
    return this.driver.query<CloneResult>("clone", options ? [entityId, options] : [entityId]);
  }

  async reparent(entityId: string, newParentId: string, options?: { keepGlobalTransform?: boolean }): Promise<{ ok: boolean; error?: string }> {
    return this.driver.query<{ ok: boolean; error?: string }>("reparent", [entityId, newParentId, options ?? {}]);
  }

  async raycast(from: GodotVec2, to: GodotVec2, options?: { excludeEntityId?: string; mask?: number }): Promise<unknown> {
    return this.driver.query("raycast", [from, to, options ?? {}]);
  }

  async getShapes(entityId: string): Promise<ShapeInfo[]> {
    return this.driver.query<ShapeInfo[]>("getShapes", [entityId]);
  }

  async getJoints(entityId?: string): Promise<JointInfo[]> {
    return this.driver.query<JointInfo[]>("getJoints", entityId ? [entityId] : []);
  }

  async getOverlaps(entityId: string): Promise<unknown> {
    return this.driver.query("getOverlaps", [entityId]);
  }

  async queryPoint(x: number, y: number): Promise<unknown> {
    return this.driver.query("queryPoint", [x, y]);
  }

  async subscribe(request: SubscribeRequest): Promise<SubscribeResult> {
    return this.driver.query<SubscribeResult>("subscribe", [request]);
  }

  async unsubscribe(subId: string): Promise<{ ok: boolean; error?: string }> {
    return this.driver.query<{ ok: boolean; error?: string }>("unsubscribe", [subId]);
  }

  async pollEvents(subId?: string, maxEvents?: number): Promise<PollEventsResult> {
    const options: Record<string, unknown> = {};
    if (subId) options.subId = subId;
    if (maxEvents) options.max = maxEvents;
    return this.driver.query<PollEventsResult>("pollEvents", [options]);
  }

  async listSubscriptions(): Promise<{ subscriptions: Array<{ subId: string; types: string[]; limitPerPoll: number }> }> {
    return this.driver.query<{ subscriptions: Array<{ subId: string; types: string[]; limitPerPoll: number }> }>("listSubscriptions");
  }

  async getEntityJoints(entityId: string): Promise<JointInfo[]> {
    return this.driver.query<JointInfo[]>("getEntityJoints", [entityId]);
  }

  async queryAABB(minX: number, minY: number, maxX: number, maxY: number): Promise<string[]> {
    return this.driver.query<string[]>("queryAABB", [minX, minY, maxX, maxY]);
  }

  async queryAst(ast: Record<string, unknown>, options?: { limit?: number; offset?: number }): Promise<QueryResult> {
    return this.driver.query<QueryResult>("queryAst", options ? [ast, options] : [ast]);
  }

  async raycastAll(from: GodotVec2, to: GodotVec2, options?: { excludeEntityId?: string; mask?: number }): Promise<unknown> {
    return this.driver.query("raycastAll", [from, to, options ?? {}]);
  }

  async getAllOverlaps(): Promise<Record<string, string[]>> {
    return this.driver.query<Record<string, string[]>>("getAllOverlaps");
  }

  async lifecycleBatch(ops: Array<{ op: string; entityId?: string; templateId?: string; x?: number; y?: number }>): Promise<{ results: unknown[]; successCount: number; failCount: number }> {
    return this.driver.query<{ results: unknown[]; successCount: number; failCount: number }>("lifecycleBatch", [ops]);
  }
}
