import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext, InputEvent, FrameData, CollisionInfo } from './types';
import { EventQueueImpl } from './EventQueue';

export class GameSystemRunner {
  private systems: RuntimeSystem[] = [];
  private systemsByPhase = new Map<SystemPhase, RuntimeSystem[]>();
  private eventQueue = new EventQueueImpl();
  private initialized = false;

  private inputEvents: InputEvent[] = [];
  private collisions: CollisionInfo[] = [];

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

  /**
   * Execute one game frame following the phase order.
   * 
   * PHASE CONTRACT:
   * ┌──────────────┬──────────────────────┬──────────────────────┐
   * │    Phase     │   frame.inputEvents  │   frame.collisions   │
   * ├──────────────┼──────────────────────┼──────────────────────┤
   * │ PRE_UPDATE   │ PRODUCER (write)     │ empty (ignored)      │
   * │ GAME_LOGIC   │ CONSUMER (read)      │ CONSUMER (read)      │
   * │ PHYSICS      │ empty (ignored)      │ PRODUCER (write)     │
   * │ POST_PHYSICS │ CONSUMER (read)      │ CONSUMER (read)      │
   * │ VISUAL       │ CONSUMER (read)      │ CONSUMER (read)      │
   * │ CLEANUP      │ CONSUMER (read)      │ CONSUMER (read)      │
   * └──────────────┴──────────────────────┴──────────────────────┘
   * 
   * FRAME LIFECYCLE:
   * 1. Reset event buffers (inputEvents, collisions) to empty arrays
   * 2. Flush pending events from eventQueue to their handlers
   * 3. Create FrameData object wrapping the buffers
   * 4. Execute each phase in order, passing FrameData to all systems
   * 5. Return, leaving buffers populated for inspection/debugging
   * 
   * BUFFER OWNERSHIP:
   * - Runner owns and resets the buffers at the start of each update()
   * - PRE_UPDATE systems append to frame.inputEvents (InputSystem produces)
   * - PHYSICS systems append to frame.collisions (PhysicsSystem produces)
   * - GAME_LOGIC systems read both buffers (RulesEngine consumes)
   * - POST_PHYSICS/VISUAL/CLEANUP systems read for effects/rendering
   * - Buffers persist until next update() call (for debugging inspection)
   * 
   * @param ctx - Update context containing dt, elapsed, frameId, input state, game state
   * @throws Error if runner is not initialized
   */
  update(ctx: UpdateContext): void {
    if (!this.initialized) {
      throw new Error('GameSystemRunner is not initialized');
    }

    this.inputEvents.length = 0;
    this.collisions.length = 0;

    this.eventQueue.flush();

    const frame: FrameData = {
      inputEvents: this.inputEvents,
      collisions: this.collisions,
    };

    const ctxWithFrame: UpdateContext = {
      ...ctx,
      frame,
    };

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
          system.update(ctxWithFrame, system.getState());
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
