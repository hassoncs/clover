import { SystemPhase, getAllSystemExpressionFunctions } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { BehaviorExecutor, createBehaviorExecutor } from '../../../BehaviorExecutor';
import type { BehaviorContext } from '../../../BehaviorContext';
import type { RuntimeEntity } from '../../../types';
import type { ComputedValueSystem, EvalContext } from '@slopcade/shared';
import type { CameraSystem } from '../../../CameraSystem';
import type { InputEntityManager } from '../../../InputEntityManager';
import * as Haptics from '@/lib/haptics';

export interface BehaviorExecutorSystemConfig {
  pixelsPerMeter: number;
  debug?: boolean;
}

export interface BehaviorExecutorSystemState {
  executionCount: number;
  lastExecutionTime: number;
}

export class BehaviorExecutorRuntimeSystem implements RuntimeSystem<BehaviorExecutorSystemConfig, BehaviorExecutorSystemState> {
  readonly id = 'behavior-executor';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 30;
  
  private config: BehaviorExecutorSystemConfig;
  private behaviorExecutor: BehaviorExecutor | null = null;
  private systemContext: SystemContext | null = null;
  private pixelsPerMeter: number = 50;
  private executionCount = 0;
  private lastExecutionTime = 0;
  
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  constructor(config: BehaviorExecutorSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: BehaviorExecutorSystemConfig): void {
    this.systemContext = ctx;
    this.pixelsPerMeter = this.config.pixelsPerMeter;
    this.behaviorExecutor = createBehaviorExecutor();
  }
  
  update(ctx: UpdateContext, _state: BehaviorExecutorSystemState): void {
    if (this.config.debug) {
      console.log('[BehaviorExecutor] UPDATE CALLED');
    }
    
    if (!this.behaviorExecutor || !this.systemContext) {
      if (this.config.debug) {
        console.log('[BehaviorExecutor] Early return - behaviorExecutor:', !!this.behaviorExecutor, 'systemContext:', !!this.systemContext);
      }
      return;
    }
    
    const startTime = performance.now();
    
    const entities = this.systemContext.entityManager.getAllEntities() as RuntimeEntity[];
    const ballEntity = entities.find(e => e.id === 'ball');
    if (ballEntity && this.config.debug) {
      console.log('[BehaviorExecutor] Ball entity found:', {
        id: ballEntity.id,
        active: ballEntity.active,
        hasPhysics: !!ballEntity.physics,
        behaviorCount: ballEntity.behaviors.length,
        behaviors: ballEntity.behaviors.map(b => b.definition.type)
      });
    }
    
    const activeEntities = entities.filter(e => e.active);
    if (ballEntity && this.config.debug) {
      console.log('[BehaviorExecutor] Total entities:', entities.length, 'Active entities:', activeEntities.length);
      console.log('[BehaviorExecutor] Ball is active:', ballEntity.active, 'Included in activeEntities:', activeEntities.includes(ballEntity));
    }
    
    const behaviorContext = this.createBehaviorContext(ctx);
    
    this.behaviorExecutor.executeAll(activeEntities, behaviorContext);
    
    this.executionCount++;
    this.lastExecutionTime = performance.now() - startTime;
  }
  
  destroy(): void {
    this.behaviorExecutor = null;
    this.systemContext = null;
    this.computedValues = undefined;
    this.camera = undefined;
    this.inputEntityManager = undefined;
    this.executionCount = 0;
    this.lastExecutionTime = 0;
  }
  
  getState(): BehaviorExecutorSystemState {
    return {
      executionCount: this.executionCount,
      lastExecutionTime: this.lastExecutionTime,
    };
  }
  
  getBehaviorExecutor(): BehaviorExecutor | null {
    return this.behaviorExecutor;
  }
  
  setComputedValues(computedValues: ComputedValueSystem): void {
    this.computedValues = computedValues;
  }
  
  setCamera(camera: CameraSystem): void {
    this.camera = camera;
  }
  
  setInputEntityManager(inputEntityManager: InputEntityManager): void {
    this.inputEntityManager = inputEntityManager;
  }
  
  private createBehaviorContext(ctx: UpdateContext): Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'> {
    if (!this.systemContext) {
      throw new Error('[BehaviorExecutorRuntimeSystem] Cannot create context without systemContext');
    }
    
    const evalContext: EvalContext = {
      time: ctx.elapsed,
      wave: 1,
      dt: ctx.dt,
      frameId: ctx.frameId,
      variables: ctx.gameState.variables,
      random: Math.random,
      entityManager: this.systemContext.entityManager,
      customFunctions: getAllSystemExpressionFunctions(),
    };
    
    return {
      dt: ctx.dt,
      elapsed: ctx.elapsed,
      // Casts: Readonly<T> → T - Safe because BehaviorExecutor only reads these values
      input: ctx.input as any,
      gameState: ctx.gameState as any,
      entityManager: this.systemContext.entityManager,
      physics: this.systemContext.physics,
      collisions: ctx.frame.collisions,
      pixelsPerMeter: this.pixelsPerMeter,
      
      computedValues: this.computedValues!,
      evalContext,
      createEvalContextForEntity: (entity) => {
        if (!entity) return evalContext;
        const velocity = entity.physics 
          ? this.systemContext!.physics.getLinearVelocity(entity.id)
          : { x: 0, y: 0 };
        return {
          ...evalContext,
          entity: {
            id: entity.id,
            x: entity.transform.x,
            y: entity.transform.y,
            angle: entity.transform.angle,
            vx: velocity.x,
            vy: velocity.y,
          },
        };
      },

      setGameState: (state: string) => {
        this.systemContext!.eventQueue.emit('game_state_changed', { state });
      },
      spawnEntity: (templateId: string, x: number, y: number) => {
        return this.systemContext!.entityManager.spawnEntity({
          templateId,
          position: { x, y },
        });
      },
      setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
        this.systemContext!.bridge.setLinearVelocity(entityId, velocity);
      },
      setEntityRotation: (entityId: string, angle: number) => {
        this.systemContext!.bridge.setRotation(entityId, angle);
      },
      setEntityPosition: (entityId: string, x: number, y: number) => {
        const entity = this.systemContext!.entityManager.getEntity(entityId);
        if (entity) {
          entity.transform.x = x;
          entity.transform.y = y;
        }
        this.systemContext!.bridge.setPosition(entityId, x, y);
      },
      setEntityOpacity: (entityId: string, opacity: number) => {
        this.systemContext!.bridge.setOpacity(entityId, opacity);
      },
      destroyEntity: (entityId: string) => {
        this.systemContext!.entityManager.destroyEntity(entityId);
      },
      triggerEvent: (eventName: string, data?: Record<string, unknown>) => {
        this.systemContext!.eventBus.emit(eventName, data);
      },
      triggerParticleEffect: (type: any, x: number, y: number) => {
        this.systemContext!.bridge.spawnParticle(type, x, y);
      },
      createEntityEmitter: (_type: any, _x: number, _y: number) => {
        return `emitter_${Date.now()}`;
      },
      updateEmitterPosition: (_emitterId: string, _x: number, _y: number) => {},
      stopEmitter: (_emitterId: string) => {},
      playSound: (soundId: string) => {
        this.systemContext!.bridge.playSound(soundId);
      },
      haptic: (style?: string) => {
        Haptics.impactAsync((style as Haptics.ImpactFeedbackStyle) ?? 'Medium');
      },
      hapticNotification: (style?: string) => {
        Haptics.notificationAsync((style as 'Success' | 'Warning' | 'Error') ?? 'Success');
      },
      hapticSelection: () => {
        Haptics.selectionAsync();
      },
      applySpriteEffect: (entityId: string, effect: any, params?: Record<string, unknown>) => {
        this.systemContext!.bridge.applySpriteEffect(entityId, effect, params);
      },
      clearSpriteEffect: (entityId: string) => {
        this.systemContext!.bridge.clearSpriteEffect(entityId);
      },
    };
  }
}
