import type {
  DebugOps,
  TimeState,
  ShapeInfo,
  JointInfo,
  GameEvent,
} from '@slopcade/shared/types/debug-ops';
import { WorldOpsImpl } from './WorldOpsImpl';
import type { GodotDebugBridge } from '@slopcade/godot-bridge';
import type { SlopcadeDebugBridge } from './debug/SlopcadeDebugBridge';

export class DebugOpsImpl extends WorldOpsImpl implements DebugOps {
  constructor(
    private godotDebugBridge: GodotDebugBridge,
    private slopcadeDebugBridge: SlopcadeDebugBridge,
    ...worldOpsArgs: ConstructorParameters<typeof WorldOpsImpl>
  ) {
    super(...worldOpsArgs);
  }

  async pause(): Promise<void> {
    this.slopcadeDebugBridge.pause();
  }

  async resume(): Promise<void> {
    this.slopcadeDebugBridge.resume();
  }

  async step(frames?: number): Promise<void> {
    await this.slopcadeDebugBridge.step(frames);
  }

  async getTimeState(): Promise<TimeState> {
    const state = this.slopcadeDebugBridge.getTimeState();
    return {
      paused: state.paused,
      timeScale: this.slopcadeDebugBridge.timeScale,
      frame: this.slopcadeDebugBridge.frame,
      elapsed: this.slopcadeDebugBridge.elapsed,
    };
  }

  async setTimeScale(scale: number): Promise<void> {
    this.slopcadeDebugBridge.setTimeScale(scale);
  }

  async screenshot(): Promise<string> {
    const result = await this.godotDebugBridge.captureScreenshot();
    return result.base64;
  }

  async getEntityProps(entityId: string, paths: string[]): Promise<Record<string, unknown>> {
    const result = await this.godotDebugBridge.getProps(entityId, paths);
    return result.values ?? {};
  }

  async setEntityProps(entityId: string, values: Record<string, unknown>): Promise<void> {
    await this.godotDebugBridge.setProps(entityId, values);
  }

  async getAllEntityProps(entityId: string): Promise<Record<string, unknown>> {
    return this.godotDebugBridge.getAllProps(entityId);
  }

  async queryCss(selector: string): Promise<string[]> {
    const result = await this.godotDebugBridge.query(selector);
    return result.matches.map((m) => m.entityId);
  }

  async getShapes(entityId: string): Promise<ShapeInfo[]> {
    const result = await this.godotDebugBridge.getShapes(entityId);
    return result.shapes
      .filter((s) => s.kind !== 'worldBoundary' && s.kind !== 'unknown' && s.kind !== 'segment')
      .map((s) => ({
        type: (s.kind === 'rect' ? 'box' : s.kind) as 'circle' | 'box' | 'capsule' | 'polygon',
        isSensor: s.disabled,
        offset: s.localPosition,
        radius: s.radius,
        halfExtents: s.extents,
        height: s.height,
        vertices: s.points,
      }));
  }

  async getJoints(entityId?: string): Promise<JointInfo[]> {
    const result = await this.godotDebugBridge.getJoints(entityId);
    return result.joints.map((j) => ({
      id: String(j.jointId),
      type: j.type as 'revolute' | 'prismatic' | 'distance' | 'weld' | 'rope',
      entityA: j.aId,
      entityB: j.bId,
      anchorA: (j.params.anchorA as { x: number; y: number }) ?? { x: 0, y: 0 },
      anchorB: (j.params.anchorB as { x: number; y: number }) ?? { x: 0, y: 0 },
    }));
  }

  async getOverlaps(entityId: string): Promise<string[]> {
    try {
      const result = await this.godotDebugBridge.getOverlaps(entityId);
      return (result?.overlaps ?? []).map((o) => o.entityId);
    } catch {
      return [];
    }
  }

  async subscribe(eventType: string, selector?: string): Promise<string> {
    const result = await this.godotDebugBridge.subscribe({
      types: [eventType],
      where: selector ? { tag: selector } : undefined,
    });
    return result.subId ?? '';
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    await this.godotDebugBridge.unsubscribe(subscriptionId);
  }

  async pollEvents(subscriptionId?: string): Promise<GameEvent[]> {
    const result = await this.godotDebugBridge.pollEvents({ subId: subscriptionId });
    return (result.events ?? []).map((e) => ({
      type: e.type,
      timestamp: e.timestampMs,
      data: e.data ?? {},
    }));
  }
}
