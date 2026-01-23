/**
 * GameRuntime Multiplayer Integration Adapter
 *
 * INTEGRATION GUIDE - In GameRuntime.native.tsx stepGame():
 *
 * ```typescript
 * // === MULTIPLAYER: Pre-step ===
 * // if (networkAdapter) {
 * //   if (isHost) networkAdapter.hostUpdate(inputRef.current);
 * //   else networkAdapter.clientUpdate(inputRef.current);
 * //   return; // Skip local physics when networked
 * // }
 * physics.step(dt, 8, 3);
 * // ... rest of update ...
 * ```
 */

import type { Physics2D, BodyId } from '../../physics2d';
import type { RuntimeEntity } from '../../game-engine/types';
import { Box2DSynchronizer, type Box2DWorldAdapter } from '../sync/Box2DSynchronizer';
import { NetEntityRegistry, type NetEntityRecord } from '../sync/NetEntityRegistry';
import type { NetworkTransport, PlayerInput, BodyState, PeerId, NetEntityId } from '../types';

export interface EntityManagerLike {
  getActiveEntities(): RuntimeEntity[];
  getEntity(id: string): RuntimeEntity | undefined;
}

export interface GameRuntimeAdapterConfig {
  physics: Physics2D;
  entityManager: EntityManagerLike;
  transport: NetworkTransport;
  fixedTimestep?: number;
}

export class GameRuntimeAdapter implements Box2DWorldAdapter {
  private physics: Physics2D;
  private entityManager: EntityManagerLike;
  private registry: NetEntityRegistry;
  private synchronizer: Box2DSynchronizer;
  private tickId = 0;
  private fixedTimestep: number;

  constructor(config: GameRuntimeAdapterConfig) {
    this.physics = config.physics;
    this.entityManager = config.entityManager;
    this.fixedTimestep = config.fixedTimestep ?? 1 / 60;

    this.registry = new NetEntityRegistry(config.transport.localPeerId);
    this.synchronizer = new Box2DSynchronizer(config.transport, this);

    this.registerExistingEntities();
  }

  private registerExistingEntities(): void {
    const entities = this.entityManager.getActiveEntities();
    for (const entity of entities) {
      if (entity.bodyId) {
        this.registry.register(
          entity.id,
          entity.bodyId.value,
          entity.template ?? 'unknown'
        );
      }
    }
  }

  getDynamicBodies(): Array<{ id: string; netEntityId: NetEntityId }> {
    const result: Array<{ id: string; netEntityId: NetEntityId }> = [];
    const entities = this.entityManager.getActiveEntities();

    for (const entity of entities) {
      if (!entity.bodyId) continue;
      const record = this.registry.getByLocalEntityId(entity.id);
      if (record) {
        result.push({ id: entity.id, netEntityId: record.netEntityId });
      }
    }

    return result;
  }

  getBodyState(id: string): BodyState {
    const entity = this.entityManager.getEntity(id);
    const record = this.registry.getByLocalEntityId(id);

    if (!entity?.bodyId || !record) {
      return {
        id,
        netEntityId: record?.netEntityId ?? id,
        position: { x: 0, y: 0 },
        angle: 0,
        linearVelocity: { x: 0, y: 0 },
        angularVelocity: 0,
        isAwake: false,
      };
    }

    const transform = this.physics.getTransform(entity.bodyId);
    const velocity = this.physics.getLinearVelocity(entity.bodyId);
    const angularVel = this.physics.getAngularVelocity(entity.bodyId);

    return {
      id,
      netEntityId: record.netEntityId,
      position: transform.position,
      angle: transform.angle,
      linearVelocity: velocity,
      angularVelocity: angularVel,
      isAwake: true,
    };
  }

  setBodyState(id: string, state: BodyState): void {
    const entity = this.entityManager.getEntity(id);
    if (!entity?.bodyId) return;

    this.physics.setTransform(entity.bodyId, { position: state.position, angle: state.angle });
    this.physics.setLinearVelocity(entity.bodyId, state.linearVelocity);
    this.physics.setAngularVelocity(entity.bodyId, state.angularVelocity);
  }

  applyInput(_playerId: PeerId, _input: PlayerInput): void {
  }

  step(deltaTime: number): void {
    this.physics.step(deltaTime, 8, 3);
  }

  getTickId(): number {
    return this.tickId;
  }

  incrementTickId(): void {
    this.tickId++;
  }

  hostUpdate(input: PlayerInput): void {
    this.synchronizer.hostUpdate(input);
  }

  clientUpdate(input: PlayerInput): void {
    this.synchronizer.clientUpdate(input);
  }

  onMessage(message: any, fromPeerId: PeerId): void {
    this.synchronizer.onMessage(message, fromPeerId);
  }

  registerEntity(localId: string, bodyId: number, templateId: string): NetEntityRecord {
    return this.registry.register(localId, bodyId, templateId);
  }

  unregisterEntity(localId: string): void {
    this.registry.unregisterByLocalId(localId);
  }

  setGameState(state: Parameters<typeof this.synchronizer.setGameState>[0]): void {
    this.synchronizer.setGameState(state);
  }

  getGameState() {
    return this.synchronizer.getGameState();
  }
}

export function createNetworkAdapter(config: GameRuntimeAdapterConfig): GameRuntimeAdapter {
  return new GameRuntimeAdapter(config);
}
