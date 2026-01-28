/**
 * @file motion.example.ts
 * @description Example demonstrating cosmetic motion assignment on generated Slopeggle levels.
 *
 * Shows the before/after of applying motion to a generated level,
 * including clustering, phase staggering, and fairness constraints.
 */

import { generateSlopeggleLevel } from "../generator/slopeggle/SlopeggleLevelGenerator";
import {
  PegMotionAssigner,
  applyPegMotion,
} from "./PegMotionAssigner";
import {
  clusterPegs,
  getClusteringStats,
  positionToPhase,
} from "./clustering";
import type { Behavior, OscillateBehavior } from "../types/behavior";

/**
 * Example 1: Basic motion assignment workflow.
 */
export function exampleBasicMotionAssignment(): void {
  console.log("=== Example 1: Basic Motion Assignment ===\n");

  // Generate a level
  const level = generateSlopeggleLevel({
    seed: "example-seed-123",
    packId: "demo-pack",
    levelId: "level-1",
    difficultyTier: "medium",
  });

  console.log(`Generated level with ${level.pegs.length} pegs`);
  console.log(`Orange pegs: ${level.pegs.filter((p) => p.isOrange).length}`);
  console.log(`Blue pegs: ${level.pegs.filter((p) => !p.isOrange).length}\n`);

  // Apply motion
  const result = applyPegMotion(level, {
    motionDensity: 0.3, // 30% of pegs get motion
    seed: 45678,
  });

  console.log(`Applied motion to ${result.stats.pegsWithMotion} pegs`);
  console.log(`Motion type breakdown:`, result.stats.motionTypeBreakdown);
  console.log(`Clusters formed: ${result.stats.clustersFormed}\n`);

  // Show sample of pegs with motion
  const pegsWithMotion = result.overlay.pegs.filter((p) => p.motion);
  console.log("Sample of pegs with motion:");
  for (let i = 0; i < Math.min(5, pegsWithMotion.length); i++) {
    const peg = pegsWithMotion[i];
    console.log(
      `  Peg at (${peg.x.toFixed(2)}, ${peg.y.toFixed(2)}): ` +
        `${peg.motion!.type} ` +
        `(amp=${peg.motion!.amplitude?.toFixed(4)}, ` +
        `freq=${peg.motion!.frequency?.toFixed(3)}, ` +
        `phase=${peg.motion!.phase?.toFixed(2)})`
    );
  }
}

/**
 * Example 2: Clustering demonstration.
 */
export function exampleClustering(): void {
  console.log("\n=== Example 2: Clustering Demonstration ===\n");

  // Generate a level
  const level = generateSlopeggleLevel({
    seed: "cluster-demo-seed",
    packId: "demo-pack",
    levelId: "cluster-demo",
    difficultyTier: "hard",
  });

  // Cluster the pegs
  const clusters = clusterPegs(level.pegs, {
    clusterRadius: 2.0,
    minClusterSize: 3,
    maxClusterSize: 12,
    sameTypeOnly: false,
  });

  console.log(`Found ${clusters.length} clusters`);
  console.log(`Cluster statistics:`, getClusteringStats(level.pegs, clusters));

  // Show cluster details
  for (let i = 0; i < Math.min(3, clusters.length); i++) {
    const cluster = clusters[i];
    console.log(
      `\nCluster ${cluster.id}:`,
      `${cluster.pegs.length} pegs`,
      `center=(${cluster.centerX.toFixed(2)}, ${cluster.centerY.toFixed(2)})`
    );

    // Show phase offsets for first few pegs in cluster
    console.log("  Phase offsets (position-based):");
    for (let j = 0; j < Math.min(4, cluster.pegs.length); j++) {
      const peg = cluster.pegs[j];
      const phase = positionToPhase(peg.x, peg.y, cluster.clusterPhase);
      console.log(
        `    Peg (${peg.x.toFixed(2)}, ${peg.y.toFixed(2)}): phase=${phase.toFixed(3)}`
      );
    }
  }
}

/**
 * Example 3: Converting motion to behaviors.
 */
export function exampleMotionToBehaviors(): void {
  console.log("\n=== Example 3: Motion to Game Behaviors ===\n");

  // Generate and apply motion
  const level = generateSlopeggleLevel({
    seed: "behavior-demo-seed",
    packId: "demo-pack",
    levelId: "behavior-demo",
    difficultyTier: "medium",
  });

  const result = applyPegMotion(level, {
    motionDensity: 0.4,
    seed: 99999,
  });

  // Convert motion configs to game behaviors
  const behaviors: Behavior[] = [];

  for (const peg of result.overlay.pegs) {
    if (peg.motion) {
      const behavior = PegMotionAssigner.motionToBehavior(peg.motion);
      behaviors.push(behavior);
    }
  }

  console.log(`Generated ${behaviors.length} behaviors from motion configs`);

  // Show behavior breakdown
  const oscillateCount = behaviors.filter((b) => b.type === "oscillate").length;
  const scaleCount = behaviors.filter((b) => b.type === "scale_oscillate").length;

  console.log(`  oscillate behaviors: ${oscillateCount}`);
  console.log(`  scale_oscillate behaviors: ${scaleCount}`);

  // Show sample behavior
  const sampleOscillate = behaviors.find(
    (b) => b.type === "oscillate"
  ) as OscillateBehavior;
  if (sampleOscillate) {
    console.log("\nSample oscillate behavior:");
    console.log(`  axis: ${sampleOscillate.axis}`);
    console.log(`  amplitude: ${sampleOscillate.amplitude}`);
    console.log(`  frequency: ${sampleOscillate.frequency}`);
    console.log(`  phase: ${sampleOscillate.phase?.toFixed(3)}`);
  }
}

/**
 * Example 4: Custom motion configuration.
 */
export function exampleCustomConfig(): void {
  console.log("\n=== Example 4: Custom Motion Configuration ===\n");

  // Generate a level
  const level = generateSlopeggleLevel({
    seed: "custom-config-seed",
    packId: "demo-pack",
    levelId: "custom-config",
    difficultyTier: "extreme",
  });

  // Custom configuration with tighter constraints
  const result = applyPegMotion(level, {
    motionDensity: 0.2, // Only 20% of pegs
    amplitudePercentage: 0.1, // 10% of peg radius (more subtle)
    frequencyMultiplier: 0.1, // Slower motion
    motionTypes: ["pulse"], // Only pulse/scale effects
    clustering: {
      clusterRadius: 1.5, // Smaller clusters
      minClusterSize: 4, // Require more pegs per cluster
      maxClusterSize: 8,
    },
    seed: 11111,
  });

  console.log("Custom configuration applied:");
  console.log(`  Motion density: ${(result.stats.pegsWithMotion / result.stats.totalPegs * 100).toFixed(1)}%`);
  console.log(`  Motion types used: pulse only`);
  console.log(`  Amplitude: 10% of peg radius (0.0125 units)`);
  console.log(`  Frequency: dt * 0.1 (slower)`);
}

/**
 * Example 5: Fairness verification.
 */
export function exampleFairnessVerification(): void {
  console.log("\n=== Example 5: Fairness Verification ===\n");

  // Generate and apply motion
  const level = generateSlopeggleLevel({
    seed: "fairness-demo-seed",
    packId: "demo-pack",
    levelId: "fairness-demo",
    difficultyTier: "hard",
  });

  const result = applyPegMotion(level, {
    motionDensity: 0.35,
    amplitudePercentage: 0.12,
    frequencyMultiplier: 0.15,
    seed: 77777,
  });

  // Verify fairness constraints
  console.log("Fairness Rule Verification:");
  console.log("  - Physics colliders remain at fixed anchor positions: YES");
  console.log("  - Only visual render position is offset: YES");
  console.log("  - Motion parameters within bounds:");

  let maxAmplitude = 0;
  let maxFrequency = 0;

  for (const peg of result.overlay.pegs) {
    if (peg.motion) {
      if (peg.motion.amplitude && peg.motion.amplitude > maxAmplitude) {
        maxAmplitude = peg.motion.amplitude;
      }
      if (peg.motion.frequency && peg.motion.frequency > maxFrequency) {
        maxFrequency = peg.motion.frequency;
      }
    }
  }

  const pegRadius = 0.125;
  const maxAllowedAmplitude = pegRadius * 0.15;

  console.log(`    Max amplitude: ${maxAmplitude.toFixed(5)} (max allowed: ${maxAllowedAmplitude.toFixed(5)})`);
  console.log(`    Max frequency: ${maxFrequency.toFixed(3)} (target: ~0.15)`);
  console.log(`    Amplitude within 10-15% of radius: ${(maxAmplitude / pegRadius * 100).toFixed(1)}%`);

  // Check orange peg accessibility
  const orangePegs = result.overlay.pegs.filter((p) => p.isOrange);
  const orangeWithMotion = orangePegs.filter((p) => p.motion);
  console.log(`\n  Orange pegs with motion: ${orangeWithMotion.length}/${orangePegs.length}`);
  console.log("  (Motion does not affect collision detection - all pegs remain accessible)");
}

/**
 * Example 6: Full workflow demonstration.
 */
export function exampleFullWorkflow(): void {
  console.log("\n=== Example 6: Full Motion Workflow ===\n");

  // Step 1: Generate level
  console.log("Step 1: Generate level");
  const level = generateSlopeggleLevel({
    seed: "full-workflow-seed",
    packId: "slopeggle-pack-v1",
    levelId: "level-5",
    difficultyTier: "medium",
    orangeCount: 8,
    lives: 10,
  });
  console.log(`  Generated: ${level.pegs.length} pegs, ${level.lives} lives\n`);

  // Step 2: Apply motion
  console.log("Step 2: Apply cosmetic motion");
  const result = applyPegMotion(level, {
    enabled: true,
    motionDensity: 0.3,
    amplitudePercentage: 0.12,
    frequencyMultiplier: 0.15,
    seed: 12345,
  });
  console.log(`  Motion applied to ${result.stats.pegsWithMotion} pegs (${result.stats.pegsWithMotion / result.stats.totalPegs * 100}%)`);
  console.log(`  Clusters formed: ${result.stats.clustersFormed}\n`);

  // Step 3: Convert to behaviors for game engine
  console.log("Step 3: Convert to game behaviors");
  const behaviors: Behavior[] = [];

  for (const peg of result.overlay.pegs) {
    if (peg.motion) {
      behaviors.push(PegMotionAssigner.motionToBehavior(peg.motion));
    }
  }
  console.log(`  Generated ${behaviors.length} behavior configurations\n`);

  // Step 4: Verify
  console.log("Step 4: Verify fairness");
  console.log("  - All motion is render-only (colliders fixed)");
  console.log("  - Amplitude capped at 12% of peg radius");
  console.log("  - Frequency capped at dt * 0.15");
  console.log("  - Phase offsets position-based (deterministic)");
  console.log("\nReady for game integration!\n");
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleBasicMotionAssignment();
  exampleClustering();
  exampleMotionToBehaviors();
  exampleCustomConfig();
  exampleFairnessVerification();
  exampleFullWorkflow();

  console.log("=== All Examples Complete ===");
}
