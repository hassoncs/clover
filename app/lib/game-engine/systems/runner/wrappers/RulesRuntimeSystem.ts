import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { RulesEvaluator } from '../../../RulesEvaluator';
import type {
  GameRule,
  WinCondition,
  LoseCondition,
  ContainerConfig,
  EvalContext,
  GameVariable,
} from '@slopcade/shared';
import type { ComputedValueSystem } from '@slopcade/shared';
import type { CameraSystem } from '../../../CameraSystem';
import type { InputEntityManager } from '../../../InputEntityManager';

export interface RulesSystemConfig {
  rules: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  variables?: Record<string, GameVariable>;
  containers?: ContainerConfig[];
}

export interface RulesSystemState {
  gameState: string;
  score: number;
  lives: number;
  variables: Record<string, number | string | boolean>;
}

export class RulesRuntimeSystem implements RuntimeSystem<RulesSystemConfig, RulesSystemState> {
  readonly id = 'rules';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 50;
  
  private config: RulesSystemConfig;
  private rulesEvaluator: RulesEvaluator | null = null;
  private systemContext: SystemContext | null = null;
  
  // References to other systems (will be wired in Phase 8)
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  constructor(config: RulesSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: RulesSystemConfig): void {
    this.systemContext = ctx;
    this.rulesEvaluator = new RulesEvaluator(ctx.entityManager, this.config.containers);
    
    this.rulesEvaluator.loadRules(this.config.rules);
    this.rulesEvaluator.setWinCondition(this.config.winCondition);
    this.rulesEvaluator.setLoseCondition(this.config.loseCondition);
    
    // Convert GameVariable to primitive values
    if (this.config.variables) {
      const resolvedVars: Record<string, number | string | boolean> = {};
      for (const [key, value] of Object.entries(this.config.variables)) {
        // Skip complex types like Vec2 and expressions - they'll be handled by computed values
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
          resolvedVars[key] = value;
        } else if (typeof value === 'object' && value !== null && 'value' in value) {
          // Handle VariableWithTuning
          const varValue = (value as any).value;
          if (typeof varValue === 'number' || typeof varValue === 'string' || typeof varValue === 'boolean') {
            resolvedVars[key] = varValue;
          }
        }
      }
      this.rulesEvaluator.setInitialVariables(resolvedVars);
    }
  }
  
  update(ctx: UpdateContext, _state: RulesSystemState): void {
    if (!this.rulesEvaluator || !this.systemContext) return;
    
    // Create minimal evalContext
    const evalContext: EvalContext = {
      score: this.rulesEvaluator.getScore(),
      lives: this.rulesEvaluator.getLives(),
      time: ctx.elapsed,
      wave: 1,
      dt: ctx.dt,
      frameId: ctx.frameId,
      variables: this.rulesEvaluator.getVariables(),
      random: Math.random,
      entityManager: this.systemContext.entityManager,
      customFunctions: {},
    };
    
    // For now, pass empty collisions and minimal input
    // Full integration will come in Phase 8
    this.rulesEvaluator.update(
      ctx.dt,
      this.systemContext.entityManager,
      [], // collisions - will be wired later
      ctx.input as any,
      {}, // inputEvents - will be wired later
      this.systemContext.physics,
      this.computedValues,
      evalContext,
      this.camera,
      () => {}, // setTimeScale - will be wired later
      this.inputEntityManager,
      (soundId) => this.systemContext!.bridge.playSound(soundId),
      this.systemContext.bridge
    );
  }
  
  destroy(): void {
    this.rulesEvaluator = null;
    this.systemContext = null;
    this.computedValues = undefined;
    this.camera = undefined;
    this.inputEntityManager = undefined;
  }
  
  getState(): RulesSystemState {
    if (!this.rulesEvaluator) {
      return {
        gameState: 'ready',
        score: 0,
        lives: 3,
        variables: {},
      };
    }
    
    return {
      gameState: this.rulesEvaluator.getGameStateValue(),
      score: this.rulesEvaluator.getScore(),
      lives: this.rulesEvaluator.getLives(),
      variables: this.rulesEvaluator.getVariables(),
    };
  }
  
  getRulesEvaluator(): RulesEvaluator | null {
    return this.rulesEvaluator;
  }
  
  // Methods to wire dependencies (will be used in Phase 8)
  setComputedValues(computedValues: ComputedValueSystem): void {
    this.computedValues = computedValues;
  }
  
  setCamera(camera: CameraSystem): void {
    this.camera = camera;
  }
  
  setInputEntityManager(inputEntityManager: InputEntityManager): void {
    this.inputEntityManager = inputEntityManager;
  }
}
