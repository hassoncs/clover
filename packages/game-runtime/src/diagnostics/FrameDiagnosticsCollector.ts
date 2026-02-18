import type { UpdateContext } from '../systems/runner/types';

export interface FrameDiagnostics {
  frameId: number;
  dt: number;
  elapsed: number;
  
  input: {
    eventCount: number;
    hasTap: boolean;
    hasDrag: boolean;
    hasButtonPress: boolean;
  };
  
  collisions: {
    count: number;
    entityPairs: Array<{ a: string; b: string }>;
  };
  
  entities: {
    total: number;
    active: number;
    withPhysics: number;
  };
  
  systems: {
    executionOrder: string[];
    executionTimes: Record<string, number>;
  };
  
  timestamp: number;
}

export interface DiagnosticsState {
  currentFrame: FrameDiagnostics | null;
  lastFrames: FrameDiagnostics[];
  maxHistory: number;
}

export class FrameDiagnosticsCollector {
  private state: DiagnosticsState;
  private enabled: boolean;

  constructor(maxHistory: number = 60) {
    this.state = {
      currentFrame: null,
      lastFrames: [],
      maxHistory,
    };
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  startFrame(ctx: UpdateContext): void {
    if (!this.enabled) return;

    this.state.currentFrame = {
      frameId: ctx.frameId,
      dt: ctx.dt,
      elapsed: ctx.elapsed,
      input: {
        eventCount: ctx.frame.inputEvents.length,
        hasTap: ctx.frame.inputEvents.some(e => e.type === 'tap'),
        hasDrag: ctx.frame.inputEvents.some(e => e.type === 'drag_start' || e.type === 'drag_end'),
        hasButtonPress: ctx.frame.inputEvents.some(e => e.type === 'button_pressed'),
      },
      collisions: {
        count: ctx.frame.collisions.length,
        entityPairs: ctx.frame.collisions.map(c => ({
          a: c.entityA.id,
          b: c.entityB.id,
        })),
      },
      entities: {
        total: 0,
        active: 0,
        withPhysics: 0,
      },
      systems: {
        executionOrder: [],
        executionTimes: {},
      },
      timestamp: Date.now(),
    };
  }

  recordSystemExecution(systemId: string, executionTimeMs: number): void {
    if (!this.enabled || !this.state.currentFrame) return;

    this.state.currentFrame.systems.executionOrder.push(systemId);
    this.state.currentFrame.systems.executionTimes[systemId] = executionTimeMs;
  }

  recordEntityStats(total: number, active: number, withPhysics: number): void {
    if (!this.enabled || !this.state.currentFrame) return;

    this.state.currentFrame.entities = { total, active, withPhysics };
  }

  endFrame(): void {
    if (!this.enabled || !this.state.currentFrame) return;

    this.state.lastFrames.push(this.state.currentFrame);
    
    if (this.state.lastFrames.length > this.state.maxHistory) {
      this.state.lastFrames.shift();
    }
  }

  getCurrentFrame(): FrameDiagnostics | null {
    return this.state.currentFrame;
  }

  getLastFrames(count: number = 10): FrameDiagnostics[] {
    return this.state.lastFrames.slice(-count);
  }

  getAverageFrameTime(): number {
    if (this.state.lastFrames.length === 0) return 0;
    
    const total = this.state.lastFrames.reduce((sum, frame) => sum + frame.dt, 0);
    return total / this.state.lastFrames.length;
  }

  getCollisionRate(): number {
    if (this.state.lastFrames.length === 0) return 0;
    
    const totalCollisions = this.state.lastFrames.reduce(
      (sum, frame) => sum + frame.collisions.count, 
      0
    );
    return totalCollisions / this.state.lastFrames.length;
  }

  clear(): void {
    this.state.currentFrame = null;
    this.state.lastFrames = [];
  }
}

export const diagnosticsCollector = new FrameDiagnosticsCollector();
