import type { Physics2D } from '../../physics2d/Physics2D';
import type { EntityManager } from '../../game-engine/EntityManager';
import type { RuntimeEntity } from '../../game-engine/types';
import type { NetEntityId, PlayerInput, BodyState, GameSyncState } from '../types';
import type { Box2DWorldAdapter } from './Box2DSynchronizer';
import { NetEntityRegistry } from './NetEntityRegistry';

export interface NetworkedPhysicsAdapter extends Box2DWorldAdapter {
  preStep(tickId: number): void;
  postStep(tickId: number): void;
}

export function createNetworkedPhysicsAdapter(
  physics: Physics2D,
  entityManager: EntityManager,
  registry: NetEntityRegistry,
  options: {
    onApplyInput?: (playerId: string, input: PlayerInput) => void;
  } = {}
): NetworkedPhysicsAdapter {
  let currentTickId = 0;

  return {
    getDynamicBodies(): Array<{ id: string; netEntityId: NetEntityId }> {
      const bodies = physics.getAllBodies();
      const result: Array<{ id: string; netEntityId: NetEntityId }> = [];

      for (const bodyId of bodies) {
        const userData = physics.getUserData<{ entityId: string }>(bodyId);
        if (!userData?.entityId) continue;

        const entity = entityManager.getEntity(userData.entityId);
        if (!entity || !entity.bodyId) continue;

        const record = registry.getByBodyId(bodyId.value);
        if (record) {
          result.push({
            id: bodyId.value.toString(),
            netEntityId: record.netEntityId,
          });
        }
      }

      return result;
    },

    getBodyState(id: string): BodyState {
      const bodyId = { __brand: 'BodyId' as const, value: parseInt(id, 10) };
      const transform = physics.getTransform(bodyId);
      const linearVelocity = physics.getLinearVelocity(bodyId);
      const angularVelocity = physics.getAngularVelocity(bodyId);
      const record = registry.getByBodyId(parseInt(id, 10));

      return {
        id,
        netEntityId: record?.netEntityId ?? id,
        position: transform.position,
        angle: transform.angle,
        linearVelocity,
        angularVelocity,
        isAwake: true,
      };
    },

    setBodyState(id: string, state: BodyState): void {
      const bodyId = { __brand: 'BodyId' as const, value: parseInt(id, 10) };
      physics.setTransform(bodyId, {
        position: state.position,
        angle: state.angle,
      });
      physics.setLinearVelocity(bodyId, state.linearVelocity);
      physics.setAngularVelocity(bodyId, state.angularVelocity);
    },

    applyInput(playerId: string, input: PlayerInput): void {
      options.onApplyInput?.(playerId, input);
    },

    step(deltaTime: number): void {
      physics.step(deltaTime, 8, 3);
    },

    getTickId(): number {
      return currentTickId;
    },

    incrementTickId(): void {
      currentTickId++;
    },

    preStep(_tickId: number): void {},

    postStep(_tickId: number): void {
      entityManager.syncTransformsFromPhysics();
    },
  };
}

export interface MultiplayerGameState {
  isMultiplayer: boolean;
  isHost: boolean;
  localPlayerId: string | null;
  connectedPlayers: Array<{ id: string; name: string }>;
  gameState: GameSyncState;
}

export function createInitialMultiplayerState(): MultiplayerGameState {
  return {
    isMultiplayer: false,
    isHost: false,
    localPlayerId: null,
    connectedPlayers: [],
    gameState: {
      score: 0,
      lives: 3,
      time: 0,
      state: 'ready',
    },
  };
}
