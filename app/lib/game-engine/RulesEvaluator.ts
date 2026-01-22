import type {
  GameRule,
  WinCondition,
  LoseCondition,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  ComputedValueSystem,
  EvalContext,
} from '@slopcade/shared';
import type { EntityManager } from './EntityManager';
import type { RuntimeEntity } from './types';
import type { CollisionInfo, GameState, InputState } from './BehaviorContext';
import type { Physics2D } from '../physics2d/Physics2D';
import type { IGameStateMutator, RuleContext } from './rules/types';
import type { InputEvents } from './BehaviorContext';

import {
  ScoreActionExecutor,
  SpawnActionExecutor,
  DestroyActionExecutor,
  PhysicsActionExecutor,
  LogicActionExecutor,
  EntityActionExecutor,
} from './rules/actions';
import {
  LogicConditionEvaluator,
  PhysicsConditionEvaluator,
} from './rules/conditions';
import {
  CollisionTriggerEvaluator,
  InputTriggerEvaluator,
  LogicTriggerEvaluator,
} from './rules/triggers';

export type { RuleContext } from './rules/types';

export class RulesEvaluator implements IGameStateMutator {
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;

  private gameState: GameState['state'] = 'ready';
  private score = 0;
  private lives = 3;
  private elapsed = 0;

  private firedOnce = new Set<string>();
  private cooldowns = new Map<string, number>();
  private variables = new Map<string, number | string | boolean>();
  private pendingEvents = new Map<string, unknown>();

  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onGameStateChange?: (state: GameState['state']) => void;

  // Executors & Evaluators
  private scoreActionExecutor = new ScoreActionExecutor();
  private spawnActionExecutor = new SpawnActionExecutor();
  private destroyActionExecutor = new DestroyActionExecutor();
  private physicsActionExecutor = new PhysicsActionExecutor();
  private logicActionExecutor = new LogicActionExecutor();
  private entityActionExecutor = new EntityActionExecutor();

  private logicConditionEvaluator = new LogicConditionEvaluator();
  private physicsConditionEvaluator = new PhysicsConditionEvaluator();

  private collisionTriggerEvaluator = new CollisionTriggerEvaluator();
  private inputTriggerEvaluator = new InputTriggerEvaluator();
  private logicTriggerEvaluator = new LogicTriggerEvaluator();

  loadRules(rules: GameRule[]): void {
    this.rules = rules;
  }

  setWinCondition(condition: WinCondition | undefined): void {
    this.winCondition = condition ?? null;
  }

  setLoseCondition(condition: LoseCondition | undefined): void {
    this.loseCondition = condition ?? null;
  }

  setInitialLives(lives: number): void {
    this.lives = lives;
  }

  setCallbacks(callbacks: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onGameStateChange?: (state: GameState['state']) => void;
  }): void {
    this.onScoreChange = callbacks.onScoreChange;
    this.onLivesChange = callbacks.onLivesChange;
    this.onGameStateChange = callbacks.onGameStateChange;
  }

  start(): void {
    this.setGameState('playing');
  }

  pause(): void {
    if (this.gameState === 'playing') {
      this.setGameState('paused');
    }
  }

  resume(): void {
    if (this.gameState === 'paused') {
      this.setGameState('playing');
    }
  }

  reset(): void {
    this.score = 0;
    this.lives = 3;
    this.elapsed = 0;
    this.firedOnce.clear();
    this.cooldowns.clear();
    this.variables.clear();
    this.pendingEvents.clear();
    this.setGameState('ready');
  }

  // IGameStateMutator Implementation
  addScore(points: number): void {
    this.score += points;
    this.onScoreChange?.(this.score);
  }

  setScore(value: number): void {
    this.score = value;
    this.onScoreChange?.(this.score);
  }

  addLives(count: number): void {
    this.lives += count;
    this.onLivesChange?.(this.lives);
  }

  setLives(value: number): void {
    this.lives = value;
    this.onLivesChange?.(this.lives);
  }

  setGameState(state: GameState['state']): void {
    if (this.gameState !== state) {
      this.gameState = state;
      this.onGameStateChange?.(state);
    }
  }

  triggerEvent(eventName: string, data?: unknown): void {
    this.pendingEvents.set(eventName, data);
  }

  setVariable(name: string, value: number | string | boolean): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): number | string | boolean | undefined {
    return this.variables.get(name);
  }

  setCooldown(id: string, time: number): void {
    this.cooldowns.set(id, time);
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getGameStateValue(): GameState['state'] {
    return this.gameState;
  }

  getFullState(): GameState {
    return {
      score: this.score,
      lives: this.lives,
      time: this.elapsed,
      state: this.gameState,
    };
  }

  update(
    dt: number,
    entityManager: EntityManager,
    collisions: CollisionInfo[],
    input: InputState,
    inputEvents: InputEvents,
    physics: Physics2D,
    computedValues?: ComputedValueSystem,
    evalContext?: EvalContext
  ): void {
    if (this.gameState !== 'playing') return;

    this.elapsed += dt;

    const context: RuleContext = {
      entityManager,
      physics,
      mutator: this,
      score: this.score,
      lives: this.lives,
      elapsed: this.elapsed,
      collisions,
      events: this.pendingEvents,
      input,
      inputEvents,
      computedValues,
      evalContext,
    } as unknown as RuleContext & { cooldowns: Map<string, number> };
    (context as any).cooldowns = this.cooldowns;

    if (this.checkWinCondition(context)) {
      this.setGameState('won');
      return;
    }

    if (this.checkLoseCondition(context)) {
      this.setGameState('lost');
      return;
    }

    for (const rule of this.rules) {
      if (rule.enabled === false) continue;
      if (rule.fireOnce && this.firedOnce.has(rule.id)) continue;

      const cooldownEnd = this.cooldowns.get(rule.id);
      if (cooldownEnd && this.elapsed < cooldownEnd) continue;

      if (this.evaluateTrigger(rule.trigger, context)) {
        if (this.evaluateConditions(rule.conditions, context)) {
          this.executeActions(rule.actions, context);

          if (rule.fireOnce) {
            this.firedOnce.add(rule.id);
          }

          if (rule.cooldown) {
            this.cooldowns.set(rule.id, this.elapsed + rule.cooldown);
          }
        }
      }
    }

    this.pendingEvents.clear();
  }

  // Delegate Methods
  private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case 'collision': return this.collisionTriggerEvaluator.evaluate(trigger, context);
      case 'timer':
      case 'score':
      case 'entity_count':
      case 'event':
      case 'frame':
      case 'gameStart': return this.logicTriggerEvaluator.evaluate(trigger, context);
      case 'tap':
      case 'drag':
      case 'tilt':
      case 'button':
      case 'swipe': return this.inputTriggerEvaluator.evaluate(trigger, context);
      default: return false;
    }
  }

  private evaluateConditions(conditions: RuleCondition[] | undefined, context: RuleContext): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every(c => {
      switch (c.type) {
        case 'score':
        case 'time':
        case 'entity_count':
        case 'random':
        case 'cooldown_ready':
        case 'variable': return this.logicConditionEvaluator.evaluate(c, context);
        case 'entity_exists':
        case 'on_ground':
        case 'touching':
        case 'velocity': return this.physicsConditionEvaluator.evaluate(c, context);
        default: return true;
      }
    });
  }

  private executeActions(actions: RuleAction[], context: RuleContext): void {
    for (const a of actions) {
      switch (a.type) {
        case 'score': this.scoreActionExecutor.execute(a, context); break;
        case 'spawn': this.spawnActionExecutor.execute(a, context); break;
        case 'destroy': this.destroyActionExecutor.execute(a, context); break;
        case 'apply_impulse':
        case 'apply_force':
        case 'set_velocity':
        case 'move': this.physicsActionExecutor.execute(a, context); break;
        case 'modify': this.entityActionExecutor.execute(a, context); break;
        case 'game_state':
        case 'event':
        case 'set_variable':
        case 'start_cooldown':
        case 'lives': this.logicActionExecutor.execute(a, context); break;
      }
    }
  }

  // Keep checkWin/Lose condition for now (or move later)
  private checkWinCondition(context: RuleContext): boolean {
    if (!this.winCondition) return false;

    switch (this.winCondition.type) {
      case 'score':
        return this.score >= (this.winCondition.score ?? 0);

      case 'destroy_all':
        if (!this.winCondition.tag) return false;
        return context.entityManager.getEntitiesByTag(this.winCondition.tag).length === 0;

      case 'survive_time':
        return this.elapsed >= (this.winCondition.time ?? 0);

      case 'collect_all':
        if (!this.winCondition.tag) return false;
        return context.entityManager.getEntitiesByTag(this.winCondition.tag).length === 0;

      case 'reach_entity': {
        if (!this.winCondition.entityId) return false;
        const targetEntity = context.entityManager.getEntity(this.winCondition.entityId);
        if (!targetEntity) return false;
        const playerEntities = context.entityManager.getEntitiesByTag('player');
        if (playerEntities.length === 0) return false;
        const player = playerEntities[0];
        const dx = player.transform.x - targetEntity.transform.x;
        const dy = player.transform.y - targetEntity.transform.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 1.0;
      }

      default:
        return false;
    }
  }

  private checkLoseCondition(context: RuleContext): boolean {
    if (!this.loseCondition) return false;

    switch (this.loseCondition.type) {
      case 'entity_destroyed':
        if (this.loseCondition.entityId) {
          return !context.entityManager.getEntity(this.loseCondition.entityId);
        }
        if (this.loseCondition.tag) {
          return context.entityManager.getEntitiesByTag(this.loseCondition.tag).length === 0;
        }
        return false;

      case 'time_up':
        return this.elapsed >= (this.loseCondition.time ?? 0);

      case 'score_below':
        return this.score < (this.loseCondition.score ?? 0);

      case 'lives_zero':
        return this.lives <= 0;

      case 'entity_exits_screen': {
        // Need screenBounds in context?
        // GameRuntime passes it? No, context has screenBounds?
        // I need to add screenBounds to context in update().
        // For now, skip if missing.
        return false;
      }

      default:
        return false;
    }
  }
}
