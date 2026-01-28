# Slopeggle Level Generator - Quick Start Guide

**Version**: 1.0  
**Last Updated**: 2026-01-28

Get up and running with the Slopeggle Level Generator in 5 minutes.

---

## 🚀 Quick Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm build:shared
```

### Basic Imports

```typescript
import { generateSlopeggleLevel } from 'shared/src/generator/slopeggle/SlopeggleLevelGenerator';
import { applyPegMotion } from 'shared/src/motion/PegMotionAssigner';
import { LevelLoader } from 'shared/src/loader/LevelLoader';
```

---

## 🎯 Generate Your First Level

### 1. Basic Level Generation

```typescript
// Generate a medium difficulty level
const level = generateSlopeggleLevel({
  seed: "my-first-level",
  packId: "my-pack-v1",
  levelId: "level-1",
  difficultyTier: "medium"
});

console.log(`Generated level with ${level.pegs.length} pegs`);
console.log(`Orange pegs: ${level.pegs.filter(p => p.isOrange).length}`);
console.log(`Starting lives: ${level.lives}`);
```

**Output**:
```
Generated level with 114 pegs
Orange pegs: 8
Starting lives: 10
```

### 2. Custom Difficulty Parameters

```typescript
// Override specific difficulty settings
const customLevel = generateSlopeggleLevel({
  seed: "custom-challenge",
  packId: "my-pack-v1", 
  levelId: "custom-1",
  difficultyTier: "hard",
  // Custom overrides
  orangeCount: 12,        // More oranges than default hard (10)
  lives: 6,               // Fewer lives than default hard (8)
  hasBucket: false,       // Disable free-ball bucket
  hasPortals: true,       // Keep teleport portals
  minOrangeAccessibility: 6  // Ensure 6+ oranges are accessible
});
```

### 3. All Difficulty Tiers

```typescript
const difficulties = ["trivial", "easy", "medium", "hard", "extreme"];
const levels = difficulties.map(tier => 
  generateSlopeggleLevel({
    seed: `progression-${tier}`,
    packId: "progression-pack",
    levelId: tier,
    difficultyTier: tier as any
  })
);

// Compare difficulty progression
levels.forEach(level => {
  const oranges = level.pegs.filter(p => p.isOrange).length;
  console.log(`${level.levelId}: ${oranges} oranges, ${level.lives} lives`);
});
```

**Output**:
```
trivial: 4 oranges, 15 lives
easy: 6 oranges, 12 lives  
medium: 8 oranges, 10 lives
hard: 10 oranges, 8 lives
extreme: 12 oranges, 6 lives
```

---

## ✨ Add Cosmetic Motion

### 1. Basic Motion Assignment

```typescript
// Generate level first
const level = generateSlopeggleLevel({
  seed: "motion-demo",
  difficultyTier: "medium"
});

// Apply cosmetic motion to 30% of pegs
const result = applyPegMotion(level, {
  motionDensity: 0.3,     // 30% of pegs get motion
  amplitudePercentage: 0.12,  // 12% of peg radius
  frequencyMultiplier: 0.15,  // Slow, subtle motion
  seed: 12345
});

console.log(`Motion applied to ${result.stats.pegsWithMotion} pegs`);
console.log(`Clusters formed: ${result.stats.clustersFormed}`);
console.log(`Motion types:`, result.stats.motionTypeBreakdown);
```

**Output**:
```
Motion applied to 34 pegs
Clusters formed: 8
Motion types: { oscillate: 20, pulse: 14 }
```

### 2. Custom Motion Settings

```typescript
// Subtle motion for competitive play
const subtleMotion = applyPegMotion(level, {
  motionDensity: 0.2,         // Only 20% of pegs
  amplitudePercentage: 0.08,  // 8% amplitude (very subtle)
  frequencyMultiplier: 0.1,   // Very slow motion
  motionTypes: ["oscillate"], // Only position oscillation
  clustering: {
    clusterRadius: 1.5,       // Smaller clusters
    minClusterSize: 2,        // Pairs only
  },
  seed: 999
});

// Dramatic motion for casual play
const dramaticMotion = applyPegMotion(level, {
  motionDensity: 0.5,         // 50% of pegs
  amplitudePercentage: 0.15,  // Maximum allowed amplitude
  frequencyMultiplier: 0.15,  // Standard speed
  motionTypes: ["oscillate", "pulse"], // Both types
  seed: 777
});
```

---

## 📦 Create and Load Level Packs

### 1. Create a Level Pack

```typescript
import { createLevelPack } from 'shared/src/types/LevelPack';

// Generate multiple levels
const seeds = ["pack-level-1", "pack-level-2", "pack-level-3"];
const difficulties = ["easy", "medium", "hard"];

const levels = seeds.map((seed, i) => {
  const level = generateSlopeggleLevel({
    seed,
    packId: "quickstart-pack-v1",
    levelId: `level-${i + 1}`,
    difficultyTier: difficulties[i] as any,
    title: `Level ${i + 1}`,
    description: `A ${difficulties[i]} challenge`
  });
  
  // Add motion to levels 2 and 3
  if (i > 0) {
    const motionResult = applyPegMotion(level, {
      motionDensity: 0.2 + (i * 0.1), // Increasing motion density
      seed: 1000 + i
    });
    return motionResult.overlay;
  }
  
  return level;
});

// Create the pack
const pack = createLevelPack({
  packId: "quickstart-pack-v1",
  name: "Quickstart Demo Pack",
  description: "Three levels demonstrating the generator",
  version: "1.0.0",
  levels,
  progression: {
    unlockMode: "sequential",
    requiredScore: 1000
  }
});

console.log(`Created pack with ${pack.levels.length} levels`);
```

### 2. Save Pack to File

```typescript
import { writeFileSync } from 'fs';
import { join } from 'path';

// Save to bundled assets
const packPath = join(process.cwd(), 'shared/src/loader/__examples__/quickstart-pack.json');
writeFileSync(packPath, JSON.stringify(pack, null, 2));

console.log(`Pack saved to: ${packPath}`);
```

### 3. Load and Use Pack

```typescript
// Load the pack
const loader = new LevelLoader();
const loadedPack = await loader.loadBundled('quickstart-pack');

console.log(`Loaded: ${loadedPack.metadata.name}`);
console.log(`Levels: ${loadedPack.levels.length}`);

// Apply first level to base game
const baseGame = await loadBaseSlopeggleGame(); // Your base game loader
const gameResult = loader.applyLevel(loadedPack, 0, baseGame, {
  validate: true,
  onWarning: (warning, category) => {
    console.warn(`[${category}] ${warning}`);
  }
});

console.log(`Ready to play: ${gameResult.game.metadata.title}`);
console.log(`Starting lives: ${gameResult.game.initialLives}`);
```

---

## 🔍 Validate Generated Levels

### 1. Basic Validation

```typescript
import { 
  validateSlopeggleBounds,
  validateSlopeggleSpacing,
  validateSlopeggleOrangeCount,
  validateSlopeggleAccessibility
} from 'shared/src/validation/slopeggleValidators';

const level = generateSlopeggleLevel({
  seed: "validation-test",
  difficultyTier: "medium"
});

// Run all validators
const boundsCheck = validateSlopeggleBounds(level.pegs);
const spacingCheck = validateSlopeggleSpacing(level.pegs);
const orangeCheck = validateSlopeggleOrangeCount(level.pegs, 8); // Expected 8 oranges
const accessibilityCheck = validateSlopeggleAccessibility(level.pegs);

console.log("Validation Results:");
console.log(`Bounds: ${boundsCheck.valid ? "✅" : "❌"}`);
console.log(`Spacing: ${spacingCheck.valid ? "✅" : "❌"}`);
console.log(`Orange Count: ${orangeCheck.valid ? "✅" : "❌"}`);
console.log(`Accessibility: ${accessibilityCheck.valid ? "✅" : "❌"}`);

// Show any errors
if (!boundsCheck.valid) {
  console.log("Bounds errors:", boundsCheck.errors);
}
```

### 2. Comprehensive Level Check

```typescript
function validateLevel(level: SlopeggleLevelOverlay): boolean {
  const checks = [
    validateSlopeggleBounds(level.pegs),
    validateSlopeggleSpacing(level.pegs),
    validateSlopeggleOrangeCount(level.pegs, level.pegs.filter(p => p.isOrange).length),
    validateSlopeggleAccessibility(level.pegs)
  ];
  
  const allValid = checks.every(check => check.valid);
  const totalErrors = checks.reduce((sum, check) => sum + check.errors.length, 0);
  const totalWarnings = checks.reduce((sum, check) => sum + check.warnings.length, 0);
  
  console.log(`Level ${level.levelId}: ${allValid ? "✅ VALID" : "❌ INVALID"}`);
  console.log(`Errors: ${totalErrors}, Warnings: ${totalWarnings}`);
  
  return allValid;
}

// Test multiple levels
const testSeeds = ["test-1", "test-2", "test-3", "test-4", "test-5"];
const validLevels = testSeeds.map(seed => {
  const level = generateSlopeggleLevel({ seed, difficultyTier: "medium" });
  return validateLevel(level);
}).filter(Boolean).length;

console.log(`${validLevels}/${testSeeds.length} levels passed validation`);
```

---

## 🎮 Integration with Game Engine

### 1. Convert to Game Entities

```typescript
// Example: Convert pegs to game entities
function levelToGameEntities(level: SlopeggleLevelOverlay): Entity[] {
  return level.pegs.map((peg, index) => ({
    id: `peg-${index}`,
    name: `Peg ${index}`,
    template: peg.isOrange ? "orangePeg" : "bluePeg",
    transform: {
      position: { x: peg.x, y: peg.y, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    physics: {
      type: "circle",
      radius: 0.125,
      isStatic: true,
      restitution: 0.8
    },
    // Add motion behavior if present
    ...(peg.motion && {
      behavior: {
        type: peg.motion.type,
        ...peg.motion
      }
    })
  }));
}

const entities = levelToGameEntities(level);
console.log(`Created ${entities.length} peg entities`);
```

### 2. Apply to Existing Game

```typescript
// Merge with existing game definition
function applyLevelToGame(level: SlopeggleLevelOverlay, baseGame: GameDefinition): GameDefinition {
  const pegEntities = levelToGameEntities(level);
  
  return {
    ...baseGame,
    initialLives: level.lives,
    entities: [
      // Keep non-peg entities from base game
      ...baseGame.entities.filter(e => !e.template?.includes("peg")),
      // Add generated pegs
      ...pegEntities,
      // Add dynamic elements
      ...level.dynamicElements?.map(elem => ({
        id: `dynamic-${elem.type}`,
        name: elem.type,
        template: elem.type,
        transform: {
          position: { x: elem.x, y: elem.y, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        behavior: elem.motion
      })) || []
    ],
    metadata: {
      ...baseGame.metadata,
      title: level.title || baseGame.metadata.title,
      generatedBy: `${level.generatorId} v${level.generatorVersion}`,
      seed: level.seed
    }
  };
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "No accessible oranges" Error

```typescript
// Problem: All oranges placed in corners
const level = generateSlopeggleLevel({
  seed: "bad-seed",
  minOrangeAccessibility: 8,  // Too high for layout
  orangeCount: 6              // Not enough oranges
});

// Solution: Reduce accessibility requirement or increase orange count
const fixedLevel = generateSlopeggleLevel({
  seed: "bad-seed",
  minOrangeAccessibility: 3,  // More reasonable
  orangeCount: 8              // More oranges to choose from
});
```

#### 2. "Pegs out of bounds" Error

```typescript
// Check bounds validation
const validation = validateSlopeggleBounds(level.pegs);
if (!validation.valid) {
  console.log("Out of bounds pegs:", validation.errors);
  // Regenerate with different seed
}
```

#### 3. Motion Not Appearing

```typescript
// Ensure motion is applied correctly
const result = applyPegMotion(level, { motionDensity: 0.3, seed: 123 });

// Check if motion was actually assigned
const pegsWithMotion = result.overlay.pegs.filter(p => p.motion).length;
console.log(`${pegsWithMotion} pegs have motion assigned`);

// Convert motion to game behaviors
const behaviors = result.overlay.pegs
  .filter(p => p.motion)
  .map(p => PegMotionAssigner.motionToBehavior(p.motion!));
```

### Performance Tips

#### 1. Batch Generation

```typescript
// Generate multiple levels efficiently
const seeds = Array.from({ length: 100 }, (_, i) => `batch-${i}`);
const startTime = performance.now();

const levels = seeds.map(seed => 
  generateSlopeggleLevel({ seed, difficultyTier: "medium" })
);

const endTime = performance.now();
console.log(`Generated ${levels.length} levels in ${endTime - startTime}ms`);
console.log(`Average: ${(endTime - startTime) / levels.length}ms per level`);
```

#### 2. Reuse RNG Instances

```typescript
// For repeated generation with same seed
import { createSeededRandomWithSubstreams } from 'shared/src/generator/SeededRandom';

const rng = createSeededRandomWithSubstreams(12345);
// Reuse rng for multiple operations
```

---

## 📚 Next Steps

### Learn More

1. **[Full Documentation](../../docs/slopeggle-level-generator.md)** - Complete system overview
2. **[QA Checklist](./QA_CHECKLIST.md)** - Manual testing procedures
3. **[API Reference](../../shared/src/generator/slopeggle/)** - Detailed API docs

### Advanced Usage

1. **Custom Validators** - Add game-specific validation rules
2. **Motion Patterns** - Create custom motion behaviors
3. **Pack Sources** - Implement remote pack loading
4. **Performance Optimization** - Optimize for mobile devices

### Integration Examples

1. **React Native** - Mobile game integration
2. **Web** - Browser-based games
3. **Server** - Batch level generation
4. **Editor** - Level preview and editing

---

## 🎯 Summary

You now know how to:

✅ Generate deterministic Slopeggle levels  
✅ Apply cosmetic motion effects  
✅ Create and load level packs  
✅ Validate generated content  
✅ Integrate with game engines  
✅ Troubleshoot common issues  

**Happy level generating!** 🎮