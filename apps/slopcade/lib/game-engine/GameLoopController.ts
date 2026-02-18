/**
 * GameLoopController
 * 
 * Manages the game loop lifecycle, frame timing, and update orchestration.
 * Extracted from GameRuntime to separate concerns.
 */

export interface GameLoopConfig {
  /** Callback invoked each frame with delta time in seconds */
  onUpdate: (deltaSeconds: number) => void;
  /** Frame interval in milliseconds (default: 16ms = ~60fps) */
  intervalMs?: number;
}

export interface TimeScaleTransition {
  startScale: number;
  endScale: number;
  duration: number;
  elapsed: number;
  restoreAfter?: number;
}

export class GameLoopController {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private paused: boolean = false;
  private timeScale: number = 1.0;
  private timeScaleTarget: number = 1.0;
  private timeScaleTransition: TimeScaleTransition | null = null;
  
  private readonly onUpdate: (deltaSeconds: number) => void;
  private readonly intervalMs: number;

  constructor(config: GameLoopConfig) {
    this.onUpdate = config.onUpdate;
    this.intervalMs = config.intervalMs ?? 16;
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.intervalId !== null) {
      return; // Already running
    }

    this.lastTickTime = performance.now();
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Pause the game loop (stops calling onUpdate)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume the game loop
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if the game loop is currently paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Check if the game loop is currently running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Set time scale (affects game speed)
   * @param scale - Time scale multiplier (1.0 = normal speed)
   * @param duration - Optional transition duration in seconds
   */
  setTimeScale(scale: number, duration?: number): void {
    const currentScale = this.timeScale;

    if (duration && duration > 0) {
      this.timeScaleTransition = {
        startScale: currentScale,
        endScale: scale,
        duration: 0.2,
        elapsed: 0,
        restoreAfter: duration,
      };
    } else {
      this.timeScale = scale;
      this.timeScaleTarget = scale;
      this.timeScaleTransition = null;
    }
  }

  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Internal tick function called by setInterval
   */
  private tick(): void {
    if (this.paused) {
      return;
    }

    const now = performance.now();
    const rawDt = Math.min((now - this.lastTickTime) / 1000, 0.1); // Cap at 100ms
    this.lastTickTime = now;

    // Update time scale transition if active
    this.updateTimeScaleTransition(rawDt);

    // Apply time scale to delta
    const dt = rawDt * this.timeScale;
    
    if (dt <= 0) {
      return;
    }

    // Call update callback
    this.onUpdate(dt);
  }

  /**
   * Update time scale transition (smooth interpolation)
   */
  private updateTimeScaleTransition(rawDt: number): void {
    const transition = this.timeScaleTransition;
    if (!transition) {
      return;
    }

    transition.elapsed += rawDt;
    const t = Math.min(1, transition.elapsed / transition.duration);
    
    // Smoothstep interpolation
    const eased = t * t * (3 - 2 * t);
    this.timeScale =
      transition.startScale +
      (transition.endScale - transition.startScale) * eased;

    if (t >= 1) {
      this.timeScale = transition.endScale;
      
      if (transition.restoreAfter) {
        // Start restore transition
        this.timeScaleTransition = {
          startScale: transition.endScale,
          endScale: 1.0,
          duration: 0.2,
          elapsed: -transition.restoreAfter,
        };
      } else {
        this.timeScaleTransition = null;
      }
    }
  }
}
