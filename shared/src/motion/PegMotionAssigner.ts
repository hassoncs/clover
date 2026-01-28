/**
 * @file PegMotionAssigner.ts
 * @description Cosmetic motion assignment for Slopeggle pegs.
 *
 * Implements Peggle-like visual motion without affecting physics.
 * Motion is render-only: colliders stay fixed at anchor positions.
 *
 * Fairness Rule:
 * - Physics colliders remain at fixed anchor positions
 * - Only visual render position is offset
 * - Ball collision detection uses fixed collider positions
 * - Motion parameters are capped to prevent gameplay impact
 */

import type { SlopegglePeg, PegMotionType } from "../generator/slopeggle/types";
import type { SlopeggleLevelOverlay } from "../generator/slopeggle/types";
import type { OscillateBehavior, ScaleOscillateBehavior, Behavior } from "../types/behavior";
import { clusterPegs, positionToPhase, type PegCluster, type ClusteringConfig } from "./clustering";

/**
 * Motion assignment configuration.
 */
export interface MotionAssignmentConfig {
  /** Enable motion assignment */
  enabled: boolean;
  /** Percentage of pegs to receive motion (0-1) */
  motionDensity: number;
  /** Motion types to use */
  motionTypes: PegMotionType[];
  /** Cluster configuration for group motion */
  clustering: Partial<ClusteringConfig>;
  /** Peg radius for amplitude calculations */
  pegRadius: number;
  /** Frequency multiplier for oscillation speed */
  frequencyMultiplier: number;
  /** Amplitude as percentage of peg radius (0.1-0.15 for 10-15%) */
  amplitudePercentage: number;
  /** Random seed for deterministic assignment */
  seed: number;
}

/**
 * Result of motion assignment operation.
 */
export interface MotionAssignmentResult {
  /** The modified overlay with motion applied */
  overlay: SlopeggleLevelOverlay;
  /** Statistics about the assignment */
  stats: MotionAssignmentStats;
}

/**
 * Statistics about motion assignment.
 */
export interface MotionAssignmentStats {
  totalPegs: number;
  pegsWithMotion: number;
  pegsWithoutMotion: number;
  clustersFormed: number;
  motionTypeBreakdown: Record<PegMotionType, number>;
}

/**
 * Default motion assignment configuration.
 */
export const DEFAULT_MOTION_CONFIG: MotionAssignmentConfig = {
  enabled: true,
  motionDensity: 0.3, // 30% of pegs get motion
  motionTypes: ["oscillate", "pulse"],
  clustering: {
    clusterRadius: 2.0,
    minClusterSize: 3,
    maxClusterSize: 12,
    sameTypeOnly: false,
  },
  pegRadius: 0.125, // Slopeggle peg radius
  frequencyMultiplier: 0.15, // dt * 0.15 equivalent
  amplitudePercentage: 0.12, // 12% of peg radius (middle of 10-15%)
  seed: 0,
};

/**
 * Mulberry32 PRNG for deterministic motion assignment.
 */
class MotionRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  boolean(): boolean {
    return this.next() < 0.5;
  }

  pick<T>(array: readonly T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(this.next() * array.length)];
  }
}

/**
 * PegMotionAssigner - Assigns cosmetic motion to pegs.
 */
export class PegMotionAssigner {
  private config: MotionAssignmentConfig;
  private rng: MotionRNG;

  constructor(config: Partial<MotionAssignmentConfig> = {}) {
    this.config = { ...DEFAULT_MOTION_CONFIG, ...config };
    this.rng = new MotionRNG(this.config.seed);
  }

  /**
   * Apply motion to a generated level overlay.
   */
  applyMotion(overlay: SlopeggleLevelOverlay): MotionAssignmentResult {
    if (!this.config.enabled || this.config.motionDensity <= 0) {
      return {
        overlay,
        stats: this.getStats(overlay.pegs, []),
      };
    }

    // Create deep copy of pegs
    const pegsWithMotion: SlopegglePeg[] = overlay.pegs.map((peg) => ({
      ...peg,
    }));

    // Cluster the pegs for group motion
    const clusters = clusterPegs(pegsWithMotion, this.config.clustering);

    // Select pegs for motion
    const pegsToAnimate = this.selectPegsForMotion(pegsWithMotion, clusters);

    // Apply motion to selected pegs
    this.applyMotionToPegs(pegsToAnimate, clusters);

    // Create new overlay with modified pegs
    const modifiedOverlay: SlopeggleLevelOverlay = {
      ...overlay,
      pegs: pegsWithMotion,
    };

    return {
      overlay: modifiedOverlay,
      stats: this.getStats(overlay.pegs, pegsToAnimate),
    };
  }

  /**
   * Select which pegs should receive motion based on density and clustering.
   */
  private selectPegsForMotion(
    pegs: SlopegglePeg[],
    clusters: PegCluster[]
  ): SlopegglePeg[] {
    const targetCount = Math.floor(pegs.length * this.config.motionDensity);
    const selected: SlopegglePeg[] = [];

    // First, select from clusters (prefer clustered motion for visual effect)
    for (const cluster of clusters) {
      // Select a subset of each cluster for motion
      const clusterSize = cluster.pegs.length;
      const clusterSelectionRate = Math.min(
        1,
        (targetCount - selected.length) / (pegs.length - selected.length)
      );

      for (const peg of cluster.pegs) {
        if (selected.length >= targetCount) break;
        if (this.rng.next() < clusterSelectionRate && !selected.includes(peg)) {
          selected.push(peg);
        }
      }
    }

    // Fill remaining quota from unclustered pegs
    const unclustered = pegs.filter((p) => !selected.includes(p));
    const remaining = targetCount - selected.length;

    for (let i = 0; i < Math.min(remaining, unclustered.length); i++) {
      selected.push(unclustered[i]);
    }

    // Shuffle for variety
    return this.shuffleArray(selected);
  }

  /**
   * Apply motion configuration to selected pegs.
   */
  private applyMotionToPegs(pegs: SlopegglePeg[], clusters: PegCluster[]): void {
    const clusterMap = new Map<SlopegglePeg, PegCluster>();

    for (const cluster of clusters) {
      for (const peg of cluster.pegs) {
        clusterMap.set(peg, cluster);
      }
    }

    for (const peg of pegs) {
      const cluster = clusterMap.get(peg);
      const motionType = this.rng.pick(this.config.motionTypes)!;
      const clusterPhase = cluster?.clusterPhase ?? 0;

      peg.motion = this.createMotionConfig(peg, motionType, clusterPhase);
    }
  }

  /**
   * Create motion configuration for a single peg.
   */
  private createMotionConfig(
    peg: SlopegglePeg,
    motionType: PegMotionType,
    clusterPhase: number
  ): SlopegglePeg["motion"] {
    const amplitude = this.config.pegRadius * this.config.amplitudePercentage;
    const frequency = this.config.frequencyMultiplier;

    switch (motionType) {
      case "oscillate":
        return this.createOscillateMotion(peg, amplitude, frequency, clusterPhase);

      case "pulse":
        return this.createPulseMotion(peg, amplitude, frequency, clusterPhase);

      case "rotate":
        // Rotation not typically used for pegs, fall back to oscillate
        return this.createOscillateMotion(peg, amplitude, frequency, clusterPhase);

      case "static":
      default:
        return undefined;
    }
  }

  /**
   * Create oscillate motion configuration.
   */
  private createOscillateMotion(
    peg: SlopegglePeg,
    amplitude: number,
    frequency: number,
    clusterPhase: number
  ): SlopegglePeg["motion"] {
    // Determine oscillation axis based on position
    // Vertical motion for top/bottom areas, horizontal for sides
    const axis: "x" | "y" | "both" = this.determineOscillationAxis(peg);

    // Generate phase offset using position + cluster phase
    const phase = positionToPhase(peg.x, peg.y, clusterPhase);

    return {
      type: "oscillate",
      axis,
      amplitude,
      frequency,
      phase,
    };
  }

  /**
   * Create pulse (scale oscillate) motion configuration.
   */
  private createPulseMotion(
    peg: SlopegglePeg,
    amplitude: number,
    frequency: number,
    clusterPhase: number
  ): SlopegglePeg["motion"] {
    // Generate phase offset using position + cluster phase
    const phase = positionToPhase(peg.x, peg.y, clusterPhase);

    // Pulse uses the same properties as oscillate - amplitude controls scale variation
    // For pulse, we use amplitude to represent scale oscillation range
    return {
      type: "pulse",
      amplitude,
      frequency,
      phase,
    };
  }

  /**
   * Determine oscillation axis based on peg position.
   * Top/bottom pegs oscillate vertically, side pegs horizontally.
   */
  private determineOscillationAxis(peg: SlopegglePeg): "x" | "y" | "both" {
    // World center is at x=6, y=8 for Slopeggle
    const centerX = 6;
    const centerY = 8;

    // Calculate distance from center
    const dx = Math.abs(peg.x - centerX);
    const dy = Math.abs(peg.y - centerY);

    // Prefer vertical motion for most pegs
    // Use horizontal for pegs near the sides
    if (dx > 4) {
      return "x";
    } else if (dy > 4) {
      return "y";
    } else {
      // Diagonal motion for center pegs for visual interest
      return "both";
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Calculate assignment statistics.
   */
  private getStats(
    originalPegs: SlopegglePeg[],
    animatedPegs: SlopegglePeg[]
  ): MotionAssignmentStats {
    const motionTypeBreakdown: Record<PegMotionType, number> = {
      static: 0,
      oscillate: 0,
      rotate: 0,
      pulse: 0,
    };

    for (const peg of animatedPegs) {
      if (peg.motion) {
        motionTypeBreakdown[peg.motion.type]++;
      }
    }

    return {
      totalPegs: originalPegs.length,
      pegsWithMotion: animatedPegs.length,
      pegsWithoutMotion: originalPegs.length - animatedPegs.length,
      clustersFormed: 0, // Calculated during applyMotion
      motionTypeBreakdown,
    };
  }

  /**
   * Convert PegMotionConfig to Behavior for game engine.
   */
  static motionToBehavior(
    motion: NonNullable<SlopegglePeg["motion"]>
  ): Behavior {
    switch (motion.type) {
      case "oscillate":
        return {
          type: "oscillate",
          axis: motion.axis ?? "both",
          amplitude: motion.amplitude ?? 0.0125,
          frequency: motion.frequency ?? 0.15,
          phase: motion.phase,
          enabled: true,
        } as OscillateBehavior;

      case "pulse": {
        // Convert pulse to scale_oscillate behavior
        // Use amplitude as the scale variation range (e.g., amplitude 0.0125 = ±1.25% scale variation)
        const scaleRange = motion.amplitude ?? 0.0125;
        return {
          type: "scale_oscillate",
          min: 1.0 - scaleRange,
          max: 1.0 + scaleRange,
          speed: motion.frequency ?? 0.15,
          phase: motion.phase,
          enabled: true,
        } as ScaleOscillateBehavior;
      }

      case "rotate":
        // Convert rotate to oscillate with both axis for subtle rotation effect
        return {
          type: "oscillate",
          axis: "both",
          amplitude: motion.amplitude ?? 0.0125,
          frequency: motion.frequency ?? 0.15,
          phase: motion.phase,
          enabled: true,
        } as OscillateBehavior;

      default:
        // Static - no behavior needed
        throw new Error(`Cannot convert motion type: ${(motion as SlopegglePeg["motion"])?.type}`);
    }
  }

  /**
   * Check if a peg should have motion based on config.
   */
  shouldAnimatePeg(peg: SlopegglePeg, pegIndex: number): boolean {
    if (!this.config.enabled) return false;
    if (this.config.motionDensity >= 1) return true;
    if (this.config.motionDensity <= 0) return false;

    // Use position-based hash for deterministic selection
    const hash = this.hashPosition(peg.x, peg.y);
    return hash < this.config.motionDensity;
  }

  /**
   * Hash position to value in [0, 1).
   */
  private hashPosition(x: number, y: number): number {
    const scaledX = Math.floor(x * 1000);
    const scaledY = Math.floor(y * 1000);

    let hash = 2166136261 >>> 0;
    hash ^= scaledX;
    hash = Math.imul(hash, 16777619);
    hash ^= scaledY;
    hash = Math.imul(hash, 16777619);

    return ((hash >>> 0) / 4294967296);
  }
}

/**
 * Convenience function to apply motion to a level.
 */
export function applyPegMotion(
  overlay: SlopeggleLevelOverlay,
  config?: Partial<MotionAssignmentConfig>
): MotionAssignmentResult {
  const assigner = new PegMotionAssigner(config);
  return assigner.applyMotion(overlay);
}

/**
 * Convert motion config to game engine behavior.
 */
export function pegMotionToBehavior(
  motion: NonNullable<SlopegglePeg["motion"]>
): Behavior {
  return PegMotionAssigner.motionToBehavior(motion);
}
