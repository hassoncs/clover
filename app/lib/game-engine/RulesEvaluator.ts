import type {
  GameRule,
  WinCondition,
  LoseCondition,
  RuleTrigger,
  RuleCondition,
  RuleAction,
} from '@clover/shared';
import type { EntityManager } from './EntityManager';
import type { RuntimeEntity } from './types';
import type { CollisionInfo, GameState } from './BehaviorContext';

export interface RuleContext {
  entityManager: EntityManager;
  score: number;
  elapsed: number;
  collisions: CollisionInfo[];
  events: Map<string, unknown>;
}

export class RulesEvaluator {
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;

  private gameState: GameState['state'] = 'ready';
  private score = 0;
  private lives = 3;
  private elapsed = 0;

  private firedOnce = new Set<string>();
  private cooldowns = new Map<string, number>();
  private pendingEvents = new Map<string, unknown>();

  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onGameStateChange?: (state: GameState['state']) => void;

  loadRules(rules: GameRule[]): void {
    this.rules = rules;
  }

  setWinCondition(condition: WinCondition | undefined): void {
    this.winCondition = condition ?? null;
  }

  setLoseCondition(condition: LoseCondition | undefined): void {
    this.loseCondition = condition ?? null;
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
    this.pendingEvents.clear();
    this.setGameState('ready');
  }

  update(dt: number, entityManager: EntityManager, collisions: CollisionInfo[]): void {
    if (this.gameState !== 'playing') return;

    this.elapsed += dt;

    const context: RuleContext = {
      entityManager,
      score: this.score,
      elapsed: this.elapsed,
      collisions,
      events: this.pendingEvents,
    };

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

  handleCollision(entityA: RuntimeEntity, entityB: RuntimeEntity, context: RuleContext): void {
    for (const rule of this.rules) {
      if (rule.trigger.type !== 'collision') continue;

      const trigger = rule.trigger;
      const aHasTagA = entityA.tags.includes(trigger.entityATag);
      const aHasTagB = entityA.tags.includes(trigger.entityBTag);
      const bHasTagA = entityB.tags.includes(trigger.entityATag);
      const bHasTagB = entityB.tags.includes(trigger.entityBTag);

      const matches = (aHasTagA && bHasTagB) || (aHasTagB && bHasTagA);

      if (matches && this.evaluateConditions(rule.conditions, context)) {
        this.executeActions(rule.actions, context);
      }
    }
  }

  triggerEvent(eventName: string, data?: unknown): void {
    this.pendingEvents.set(eventName, data);
  }

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

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getGameState(): GameState['state'] {
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

  private setGameState(state: GameState['state']): void {
    if (this.gameState !== state) {
      this.gameState = state;
      this.onGameStateChange?.(state);
    }
  }

  private mapActionState(
    actionState: 'win' | 'lose' | 'pause' | 'restart' | 'next_level'
  ): GameState['state'] | null {
    switch (actionState) {
      case 'win':
        return 'won';
      case 'lose':
        return 'lost';
      case 'pause':
        return 'paused';
      case 'restart':
        this.reset();
        return 'playing';
      case 'next_level':
        return null;
      default:
        return null;
    }
  }

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

      case 'reach_entity':
        return false;

      case 'custom':
        return false;

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

      case 'entity_exits_screen':
        return false;

      case 'custom':
        return false;

      default:
        return false;
    }
  }

  private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case 'collision':
        return context.collisions.some((c) => {
          const aHasTagA = c.entityA.tags.includes(trigger.entityATag);
          const aHasTagB = c.entityA.tags.includes(trigger.entityBTag);
          const bHasTagA = c.entityB.tags.includes(trigger.entityATag);
          const bHasTagB = c.entityB.tags.includes(trigger.entityBTag);
          return (aHasTagA && bHasTagB) || (aHasTagB && bHasTagA);
        });

      case 'timer':
        if (trigger.repeat) {
          const interval = trigger.time;
          return Math.floor(this.elapsed / interval) > Math.floor((this.elapsed - 0.016) / interval);
        }
        return this.elapsed >= trigger.time && this.elapsed - 0.016 < trigger.time;

      case 'score':
        switch (trigger.comparison) {
          case 'gte':
            return this.score >= trigger.threshold;
          case 'lte':
            return this.score <= trigger.threshold;
          case 'eq':
            return this.score === trigger.threshold;
        }
        return false;

      case 'entity_count':
        const count = context.entityManager.getEntityCountByTag(trigger.tag);
        switch (trigger.comparison) {
          case 'gte':
            return count >= trigger.count;
          case 'lte':
            return count <= trigger.count;
          case 'eq':
            return count === trigger.count;
          case 'zero':
            return count === 0;
        }
        return false;

      case 'event':
        return context.events.has(trigger.eventName);

      case 'frame':
        return true;

      default:
        return false;
    }
  }

  private evaluateConditions(conditions: RuleCondition[] | undefined, context: RuleContext): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((condition) => {
      switch (condition.type) {
        case 'score':
          if (condition.min !== undefined && this.score < condition.min) return false;
          if (condition.max !== undefined && this.score > condition.max) return false;
          return true;

        case 'time':
          if (condition.min !== undefined && this.elapsed < condition.min) return false;
          if (condition.max !== undefined && this.elapsed > condition.max) return false;
          return true;

        case 'entity_exists':
          if (condition.entityId) {
            return !!context.entityManager.getEntity(condition.entityId);
          }
          if (condition.entityTag) {
            return context.entityManager.getEntitiesByTag(condition.entityTag).length > 0;
          }
          return true;

        case 'entity_count':
          const count = context.entityManager.getEntityCountByTag(condition.tag);
          if (condition.min !== undefined && count < condition.min) return false;
          if (condition.max !== undefined && count > condition.max) return false;
          return true;

        case 'random':
          return Math.random() < condition.probability;

        default:
          return true;
      }
    });
  }

  private executeActions(actions: RuleAction[], context: RuleContext): void {
    for (const action of actions) {
      switch (action.type) {
        case 'score':
          switch (action.operation) {
            case 'add':
              this.addScore(action.value);
              break;
            case 'subtract':
              this.addScore(-action.value);
              break;
            case 'set':
              this.setScore(action.value);
              break;
            case 'multiply':
              this.setScore(this.score * action.value);
              break;
          }
          break;

        case 'game_state':
          const mappedState = this.mapActionState(action.state);
          if (mappedState) {
            if (action.delay) {
              setTimeout(() => this.setGameState(mappedState), action.delay * 1000);
            } else {
              this.setGameState(mappedState);
            }
          }
          break;

        case 'spawn':
          this.executeSpawnAction(action, context);
          break;

        case 'destroy':
          this.executeDestroyAction(action, context);
          break;

        case 'event':
          this.triggerEvent(action.eventName, action.data);
          break;

        case 'sound':
          break;

        case 'modify':
          break;
      }
    }
  }

  private executeSpawnAction(
    action: Extract<RuleAction, { type: 'spawn' }>,
    context: RuleContext
  ): void {
    const count = action.count ?? 1;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;

      switch (action.position.type) {
        case 'fixed':
          x = action.position.x;
          y = action.position.y;
          break;
        case 'random':
          x =
            action.position.bounds.minX +
            Math.random() * (action.position.bounds.maxX - action.position.bounds.minX);
          y =
            action.position.bounds.minY +
            Math.random() * (action.position.bounds.maxY - action.position.bounds.minY);
          break;
        case 'at_entity':
          const entity = context.entityManager.getEntity(action.position.entityId);
          if (entity) {
            x = entity.transform.x;
            y = entity.transform.y;
          }
          break;
        case 'at_collision':
          if (context.collisions.length > 0) {
            x = context.collisions[0].entityA.transform.x;
            y = context.collisions[0].entityA.transform.y;
          }
          break;
      }

      if (action.spread) {
        x += (Math.random() - 0.5) * action.spread * 2;
        y += (Math.random() - 0.5) * action.spread * 2;
      }

      const template = context.entityManager.getTemplate(action.template);
      if (template) {
        context.entityManager.createEntity({
          id: `spawned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: template.id,
          template: action.template,
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }
    }
  }

  private executeDestroyAction(
    action: Extract<RuleAction, { type: 'destroy' }>,
    context: RuleContext
  ): void {
    switch (action.target.type) {
      case 'by_id':
        context.entityManager.destroyEntity(action.target.entityId);
        break;

      case 'by_tag':
        const entities = context.entityManager.getEntitiesByTag(action.target.tag);
        const count = action.target.count ?? entities.length;
        for (let i = 0; i < Math.min(count, entities.length); i++) {
          context.entityManager.destroyEntity(entities[i].id);
        }
        break;

      case 'collision_entities':
        if (context.collisions.length > 0) {
          context.entityManager.destroyEntity(context.collisions[0].entityA.id);
          context.entityManager.destroyEntity(context.collisions[0].entityB.id);
        }
        break;

      case 'all':
        context.entityManager.clearAll();
        break;
    }
  }
}
