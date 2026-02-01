import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from './types';
import { EventQueueImpl } from './EventQueue';

export class GameSystemRunner {
  private systems: RuntimeSystem[] = [];
  private systemsByPhase = new Map<SystemPhase, RuntimeSystem[]>();
  private eventQueue = new EventQueueImpl();
  private initialized = false;

  register<TConfig>(system: RuntimeSystem<TConfig>): void {
    if (this.initialized) {
      throw new Error(`Cannot register system '${system.id}' after initialization`);
    }

    const existing = this.systems.find(s => s.id === system.id);
    if (existing) {
      throw new Error(`System '${system.id}' is already registered`);
    }

    this.systems.push(system);

    if (!this.systemsByPhase.has(system.phase)) {
      this.systemsByPhase.set(system.phase, []);
    }
    this.systemsByPhase.get(system.phase)!.push(system);
  }

  async initialize(ctx: SystemContext): Promise<void> {
    if (this.initialized) {
      throw new Error('GameSystemRunner is already initialized');
    }

    this.sortSystemsByPriority();

    const contextWithQueue: SystemContext = {
      ...ctx,
      eventQueue: this.eventQueue,
    };

    for (const system of this.systems) {
      await system.initialize(contextWithQueue, {} as any);
    }

    this.initialized = true;
  }

  update(ctx: UpdateContext): void {
    if (!this.initialized) {
      throw new Error('GameSystemRunner is not initialized');
    }

    this.eventQueue.flush();

    const phases = [
      SystemPhase.PRE_UPDATE,
      SystemPhase.GAME_LOGIC,
      SystemPhase.PHYSICS,
      SystemPhase.POST_PHYSICS,
      SystemPhase.VISUAL,
      SystemPhase.CLEANUP,
    ];

    for (const phase of phases) {
      const systems = this.systemsByPhase.get(phase);
      if (systems) {
        for (const system of systems) {
          system.update(ctx, system.getState());
        }
      }
    }
  }

  destroy(): void {
    for (const system of this.systems) {
      system.destroy();
    }
    this.systems = [];
    this.systemsByPhase.clear();
    this.eventQueue.clear();
    this.initialized = false;
  }

  getSystem<T extends RuntimeSystem>(id: string): T | undefined {
    return this.systems.find(s => s.id === id) as T | undefined;
  }

  private sortSystemsByPriority(): void {
    for (const systems of this.systemsByPhase.values()) {
      systems.sort((a, b) => b.priority - a.priority);
    }
  }
}
