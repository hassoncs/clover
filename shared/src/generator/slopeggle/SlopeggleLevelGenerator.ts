import type {
  SlopeggleLevelOverlay,
  SlopegglePeg,
  GenerateSlopeggleLevelParams,
  SlopeggleDynamicElement,
} from "./types";
import { SLOPEGGLE_DIFFICULTY_PRESETS, SLOPEGGLE_WORLD_DEFAULTS } from "./types";
import { createSeededRandomWithSubstreams, type SeededRandom } from "../SeededRandom";

/**
 * Generate a complete Slopeggle level overlay with deterministic peg placement.
 *
 * @param params - Generation parameters including seed and difficulty settings
 * @returns Complete SlopeggleLevelOverlay ready to be applied to a game
 */
export function generateSlopeggleLevel(params: GenerateSlopeggleLevelParams): SlopeggleLevelOverlay {
  const {
    seed,
    packId,
    levelId,
    difficultyTier = "medium",
    title,
    description,
    ordinal,
    orangeCount: overrideOrangeCount,
    lives: overrideLives,
    hasBucket = true,
    hasPortals = true,
    bucketAmplitude: overrideBucketAmplitude,
    bucketFrequency: overrideBucketFrequency,
    minOrangeAccessibility: overrideMinAccessibility,
  } = params;

  // Initialize RNG with substreams for deterministic generation
  const seedNumber = typeof seed === "number" ? seed : hashStringToNumber(seed);
  const rng = createSeededRandomWithSubstreams(seedNumber);

  // Get difficulty preset and apply overrides
  const preset = SLOPEGGLE_DIFFICULTY_PRESETS[difficultyTier];
  const orangeCount = overrideOrangeCount ?? preset.orangeCount;
  const lives = overrideLives ?? preset.lives;
  const bucketAmplitude = overrideBucketAmplitude ?? preset.bucketAmplitude;
  const bucketFrequency = overrideBucketFrequency ?? preset.bucketFrequency;
  const minOrangeAccessibility = overrideMinAccessibility ?? preset.minOrangeAccessibility;

  const { width: WORLD_WIDTH, height: WORLD_HEIGHT, pegRows } = SLOPEGGLE_WORLD_DEFAULTS;
  const HALF_W = WORLD_WIDTH / 2;
  const HALF_H = WORLD_HEIGHT / 2;
  const cx = (x: number) => x - HALF_W;
  const cy = (y: number) => HALF_H - y;

  // Generate peg layout using layout stream
  const pegLayout = generatePegLayout(rng, WORLD_WIDTH, WORLD_HEIGHT, pegRows);

  // Place orange pegs using oranges stream, ensuring accessibility
  const orangeIndices = placeOrangePegs(
    rng.oranges(),
    pegLayout,
    orangeCount,
    minOrangeAccessibility,
    lives
  );

  // Mark orange pegs in the layout
  for (const idx of orangeIndices) {
    if (idx < pegLayout.length) {
      pegLayout[idx].isOrange = true;
    }
  }

  // Convert to overlay format
  const pegs: SlopegglePeg[] = pegLayout.map((peg) => ({
    x: cx(peg.x),
    y: cy(peg.y),
    isOrange: peg.isOrange,
  }));

  // Generate dynamic elements using motion stream
  const dynamicElements: SlopeggleDynamicElement[] = [];

  if (hasBucket && bucketAmplitude > 0) {
    dynamicElements.push({
      type: "bucket",
      x: 0,
      y: cy(SLOPEGGLE_WORLD_DEFAULTS.bucketY),
      motion: {
        type: "oscillate",
        axis: "x",
        amplitude: bucketAmplitude,
        frequency: bucketFrequency,
        phase: rng.motion().range(0, Math.PI * 2),
      },
    });
  }

  if (hasPortals) {
    // Place portals symmetrically using motion stream
    const portalY1 = cy(7);
    const portalY2 = cy(11);
    const portalSpacing = 1.5;

    dynamicElements.push({
      type: "portalA",
      x: cx(portalSpacing),
      y: portalY1,
    });

    dynamicElements.push({
      type: "portalB",
      x: cx(WORLD_WIDTH - portalSpacing),
      y: portalY2,
    });
  }

  // Build the overlay
  const overlay: SlopeggleLevelOverlay = {
    schemaVersion: 1,
    packId,
    levelId,
    generatorId: "slopeggle-generator",
    generatorVersion: "1.0.0",
    seed: String(seed),
    title: title ?? `Level ${levelId}`,
    description: description ?? `Clear ${orangeCount} orange pegs with ${lives} balls`,
    ordinal,
    generatedAt: Date.now(),
    difficulty: {
      targetTier: difficultyTier,
      initialLives: lives,
      estimatedDurationSeconds: estimateLevelDuration(orangeCount, lives, difficultyTier),
    },
    generatorParams: {
      orangeCount,
      lives,
      hasBucket,
      hasPortals,
      bucketAmplitude,
      bucketFrequency,
      minOrangeAccessibility,
    },
    pegs,
    lives,
    dynamicElements,
    slopeggleDifficulty: {
      targetTier: difficultyTier,
      orangeCount,
      hasBucket,
      hasPortals,
      bucketAmplitude,
      bucketFrequency,
      minOrangeAccessibility,
      initialLives: lives,
    },
  };

  return overlay;
}

/**
 * Generate the peg grid layout.
 */
interface PegLayoutItem {
  x: number;
  y: number;
  isOrange: boolean;
}

function generatePegLayout(
  rng: ReturnType<typeof createSeededRandomWithSubstreams>,
  worldWidth: number,
  worldHeight: number,
  pegRows: number
): PegLayoutItem[] {
  const pegs: PegLayoutItem[] = [];
  const layout = rng.layout();

  // Calculate vertical spacing to distribute pegs evenly
  const startY = 3.5;
  const endY = worldHeight - 2.5;
  const rowSpacing = (endY - startY) / (pegRows - 1);

  for (let row = 0; row < pegRows; row++) {
    const y = startY + row * rowSpacing;
    const isEvenRow = row % 2 === 0;

    // Alternate between 9 and 10 pegs per row
    const pegCount = isEvenRow ? 9 : 10;
    const offset = isEvenRow ? 0 : 0.5;

    // Use layout stream to vary spacing slightly for visual interest
    const spacingVariation = layout.range(-0.05, 0.05);
    const startX = 1.2 + offset * 0.5 + spacingVariation;
    const baseSpacing = (worldWidth - 2.4) / (pegCount - 1);

    for (let i = 0; i < pegCount; i++) {
      pegs.push({
        x: startX + i * baseSpacing,
        y,
        isOrange: false,
      });
    }
  }

  return pegs;
}

/**
 * Place orange pegs ensuring minimum accessibility from the launcher.
 *
 * The launcher is at the top center (x=6, y=1 in world coords).
 * We calculate which pegs are "accessible" - i.e., can be hit by a ball
 * launched from the center with typical angles.
 */
function placeOrangePegs(
  orangesRng: any,
  pegs: PegLayoutItem[],
  orangeCount: number,
  minAccessible: number,
  lives: number
): number[] {
  const accessibleIndices = getAccessiblePegIndices(pegs);
  const totalPegs = pegs.length;

  // Ensure we have enough accessible pegs
  // Enforce minimum accessible oranges
  const guaranteedAccessible = Math.max(accessibleIndices.length > 0 ? minAccessible : 0, 1);
  const accessibleOrangeCount = Math.max(
    Math.min(orangeCount, accessibleIndices.length),
    guaranteedAccessible
  );
  const nonAccessibleOrangeCount = orangeCount - accessibleOrangeCount;

  // Select indices for orange pegs
  const selectedIndices: number[] = [];

  // First, guarantee minimum accessible oranges
  const shuffledAccessible = orangesRng.shuffle([...accessibleIndices]);
  for (let i = 0; i < accessibleOrangeCount && i < shuffledAccessible.length; i++) {
    selectedIndices.push(shuffledAccessible[i]);
  }

  // Fill remaining orange slots from non-accessible pegs
  const nonAccessibleIndices = getNonAccessiblePegIndices(pegs, accessibleIndices);
  const shuffledNonAccessible = orangesRng.shuffle(nonAccessibleIndices);
  for (let i = 0; i < nonAccessibleOrangeCount && i < shuffledNonAccessible.length; i++) {
    selectedIndices.push(shuffledNonAccessible[i]);
  }

  // If we still need more oranges, fill from remaining pegs
  const remainingSlots = orangeCount - selectedIndices.length;
  if (remainingSlots > 0) {
    const allIndices = Array.from({ length: totalPegs }, (_, i) => i);
    const remaining = orangesRng.shuffle(
      allIndices.filter((i) => !selectedIndices.includes(i))
    );
    for (let i = 0; i < remainingSlots && i < remaining.length; i++) {
      selectedIndices.push(remaining[i]);
    }
  }

  return selectedIndices;
}

/**
 * Get indices of pegs that are accessible from the launcher position.
 *
 * Accessible pegs are those that can be hit by a ball launched from
 * the top center with typical launch angles (-70 to -20 degrees from horizontal).
 */
function getAccessiblePegIndices(pegs: PegLayoutItem[]): number[] {
  const launcherX = 6;
  const launcherY = 1;

  // Minimum and maximum launch angles (in radians, from horizontal)
  // Negative Y means upward in our coordinate system
  const minAngle = -Math.PI / 3; // -60 degrees (sharper upward)
  const maxAngle = -Math.PI / 12; // -15 degrees (shallower)

  const accessibleIndices: number[] = [];

  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];

    // Calculate the angle from launcher to peg
    const dx = peg.x - launcherX;
    const dy = peg.y - launcherY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
      // Too close to launcher - not a valid target
      continue;
    }

    const angle = Math.atan2(dy, dx);

    // Check if peg is within launchable angle range
    // Also check that the path isn't blocked by the top wall
    // (peg must be below a reasonable maximum y)
    if (angle >= minAngle && angle <= maxAngle && peg.y > 2) {
      accessibleIndices.push(i);
    }
  }

  // If no pegs are accessible (shouldn't happen with normal layouts),
  // return all pegs as a fallback
  if (accessibleIndices.length === 0) {
    return Array.from({ length: pegs.length }, (_, i) => i);
  }

  return accessibleIndices;
}

/**
 * Get indices of pegs that are NOT accessible from the launcher.
 */
function getNonAccessiblePegIndices(
  pegs: PegLayoutItem[],
  accessibleIndices: number[]
): number[] {
  const accessibleSet = new Set(accessibleIndices);
  return pegs
    .map((_, i) => i)
    .filter((i) => !accessibleSet.has(i));
}

/**
 * Estimate the duration of a level based on difficulty parameters.
 */
function estimateLevelDuration(
  orangeCount: number,
  lives: number,
  difficultyTier: string
): number {
  // Base time per orange (seconds)
  const baseTimePerOrange = 8;

  // Factor in difficulty tier
  const tierMultiplier = {
    easy: 1.2,
    medium: 1.0,
    hard: 0.85,
    extreme: 0.7,
  }[difficultyTier] ?? 1.0;

  // Factor in lives (fewer lives = faster play)
  const lifeFactor = Math.max(0.7, lives / 10);

  const estimatedSeconds = orangeCount * baseTimePerOrange * tierMultiplier * lifeFactor;

  return Math.round(estimatedSeconds);
}

/**
 * Hash a string seed to a number for RNG initialization.
 */
function hashStringToNumber(seed: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash || 1;
}

/**
 * Convert a SlopeggleLevelOverlay to JSON for storage or debugging.
 */
export function overlayToJSON(overlay: SlopeggleLevelOverlay): string {
  return JSON.stringify(overlay, null, 2);
}

/**
 * Parse a JSON string back to a SlopeggleLevelOverlay.
 */
export function overlayFromJSON(json: string): SlopeggleLevelOverlay {
  const parsed = JSON.parse(json);
  if (!isSlopeggleLevelOverlay(parsed)) {
    throw new Error("Invalid SlopeggleLevelOverlay JSON");
  }
  return parsed;
}

/**
 * Verify determinism by generating the same level twice with the same seed.
 */
export function verifyDeterminism(
  params: GenerateSlopeggleLevelParams
): { deterministic: boolean; overlay1: SlopeggleLevelOverlay; overlay2: SlopeggleLevelOverlay } {
  const overlay1 = generateSlopeggleLevel(params);
  const overlay2 = generateSlopeggleLevel(params);

  const json1 = overlayToJSON(overlay1);
  const json2 = overlayToJSON(overlay2);

  return {
    deterministic: json1 === json2,
    overlay1,
    overlay2,
  };
}
