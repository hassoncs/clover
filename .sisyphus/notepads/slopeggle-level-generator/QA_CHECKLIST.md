# Slopeggle Level Generator - Manual QA Checklist

**Version**: 1.0  
**Last Updated**: 2026-01-28  
**System**: Slopeggle Level Generator (Waves 1-4)

---

## Pre-Flight Checks

### ✅ 1. Determinism Verification

**Objective**: Ensure same seed produces identical levels across runs.

**Test Steps**:
1. Generate level with seed `"test-seed-123"` and difficulty `"medium"`
2. Record peg positions, orange peg indices, and dynamic element parameters
3. Generate same level again with identical parameters
4. Compare outputs

**Acceptance Criteria**:
- [ ] Peg positions match exactly (x, y coordinates)
- [ ] Orange peg placement identical (same indices marked as orange)
- [ ] Dynamic element parameters identical (bucket phase, portal positions)
- [ ] No `Math.random()` usage detected in generator code
- [ ] All RNG streams use `SeededRandom` with substreams

**Evidence Required**:
```typescript
// Example verification code
const level1 = generateSlopeggleLevel({ seed: "test-seed-123", difficultyTier: "medium" });
const level2 = generateSlopeggleLevel({ seed: "test-seed-123", difficultyTier: "medium" });
console.log("Deterministic:", JSON.stringify(level1) === JSON.stringify(level2));
```

---

### ✅ 2. Schema Validation

**Objective**: Verify generated levels conform to LevelDefinition schema.

**Test Steps**:
1. Generate levels for all difficulty tiers: `trivial`, `easy`, `medium`, `hard`, `extreme`
2. Validate each level using `isLevelDefinition()` type guard
3. Check required fields are present and correctly typed
4. Verify game-specific overrides are properly namespaced

**Acceptance Criteria**:
- [ ] All generated levels pass `isLevelDefinition()` validation
- [ ] Required fields present: `schemaVersion`, `packId`, `levelId`, `generatorId`, `generatorVersion`, `seed`
- [ ] Schema version matches `CURRENT_LEVEL_SCHEMA_VERSION` (1)
- [ ] Generator ID is `"slopeggle-generator"`
- [ ] Slopeggle overrides properly namespaced under `overrides.slopeggle`

**Evidence Required**:
```typescript
// Validate all difficulty tiers
const difficulties = ["trivial", "easy", "medium", "hard", "extreme"];
for (const tier of difficulties) {
  const level = generateSlopeggleLevel({ seed: `test-${tier}`, difficultyTier: tier });
  console.log(`${tier}: ${isLevelDefinition(level) ? "PASS" : "FAIL"}`);
}
```

---

### ✅ 3. Bounds Validation

**Objective**: Ensure all pegs are within valid world bounds.

**Test Steps**:
1. Generate 10 levels with different seeds
2. Run `validateSlopeggleBounds()` on each level's peg layout
3. Check for out-of-bounds pegs accounting for peg radius (0.125)
4. Verify no pegs in forbidden zones (launcher: y < 2.5, bucket: y > 14)

**Acceptance Criteria**:
- [ ] All pegs within bounds: `0.125 ≤ x ≤ 11.875`, `0.125 ≤ y ≤ 15.875`
- [ ] No pegs in launcher zone: `y < 2.5`
- [ ] No pegs in bucket zone: `y > 14`
- [ ] Validation errors provide specific coordinates for debugging
- [ ] No spacing violations: minimum 0.3 units between peg centers

**Evidence Required**:
```typescript
// Test bounds validation
const seeds = ["bounds-1", "bounds-2", "bounds-3", "bounds-4", "bounds-5"];
for (const seed of seeds) {
  const level = generateSlopeggleLevel({ seed, difficultyTier: "medium" });
  const validation = validateSlopeggleBounds(level.pegs);
  console.log(`${seed}: ${validation.valid ? "PASS" : "FAIL"} - ${validation.errors.length} errors`);
}
```

---

## Generation Testing

### ✅ 4. Difficulty Progression

**Objective**: Verify difficulty parameters scale appropriately across tiers.

**Test Steps**:
1. Generate one level for each difficulty tier using same base seed
2. Compare orange peg counts, lives, and accessibility parameters
3. Verify progression follows expected difficulty curve

**Acceptance Criteria**:
- [ ] Orange count increases: `trivial` (4) < `easy` (6) < `medium` (8) < `hard` (10) < `extreme` (12)
- [ ] Lives decrease: `trivial` (15) > `easy` (12) > `medium` (10) > `hard` (8) > `extreme` (6)
- [ ] Bucket amplitude increases with difficulty (3-6 range)
- [ ] Minimum accessible oranges maintained across all difficulties
- [ ] Extreme difficulty has reasonable win condition (not impossible)

**Evidence Required**:
```typescript
// Difficulty progression test
const difficulties = ["trivial", "easy", "medium", "hard", "extreme"];
const baseSeed = "difficulty-test";
for (const tier of difficulties) {
  const level = generateSlopeggleLevel({ seed: baseSeed, difficultyTier: tier });
  const orangeCount = level.pegs.filter(p => p.isOrange).length;
  console.log(`${tier}: ${orangeCount} oranges, ${level.lives} lives`);
}
```

---

### ✅ 5. Orange Accessibility

**Objective**: Ensure orange pegs are reachable from launcher position.

**Test Steps**:
1. Generate levels with different accessibility requirements (2, 4, 6, 8 minimum accessible)
2. Calculate launch angles from launcher (6, 1) to each orange peg
3. Verify minimum accessible oranges within -60° to -15° angle range
4. Test edge cases: all oranges accessible, minimum accessibility

**Acceptance Criteria**:
- [ ] Minimum accessible orange count respected in all generated levels
- [ ] Accessible oranges within launch angle range (-60° to -15° from horizontal)
- [ ] No levels with all oranges in corners (accessibility error)
- [ ] At least 50% of oranges accessible for medium difficulty
- [ ] Generator gracefully handles impossible accessibility requirements

**Evidence Required**:
```typescript
// Accessibility verification
function checkAccessibility(level: SlopeggleLevelOverlay): number {
  const launcher = { x: 6, y: 1 };
  let accessible = 0;
  for (const peg of level.pegs.filter(p => p.isOrange)) {
    const angle = Math.atan2(peg.y - launcher.y, peg.x - launcher.x);
    if (angle >= -Math.PI/3 && angle <= -Math.PI/12 && peg.y > 2) accessible++;
  }
  return accessible;
}
```

---

### ✅ 6. Seed Variation

**Objective**: Verify different seeds produce meaningfully different levels.

**Test Steps**:
1. Generate 5 levels with different seeds but same difficulty
2. Compare peg layouts, orange placements, and dynamic elements
3. Ensure sufficient variation while maintaining playability
4. Test edge case seeds: empty string, very long string, numeric string

**Acceptance Criteria**:
- [ ] Different seeds produce different peg layouts (>80% position variance)
- [ ] Orange peg placement varies significantly between seeds
- [ ] Dynamic element parameters vary (bucket phase, portal positions)
- [ ] Edge case seeds handled gracefully (no crashes)
- [ ] Variation maintains game balance (no degenerate layouts)

**Evidence Required**:
```typescript
// Seed variation test
const seeds = ["var-1", "var-2", "var-3", "var-4", "var-5"];
const levels = seeds.map(seed => generateSlopeggleLevel({ seed, difficultyTier: "medium" }));
// Compare first vs second level peg positions
const positionDiff = levels[0].pegs.filter((peg, i) => 
  Math.abs(peg.x - levels[1].pegs[i].x) > 0.1 || Math.abs(peg.y - levels[1].pegs[i].y) > 0.1
).length;
console.log(`Position variance: ${positionDiff}/${levels[0].pegs.length} pegs differ`);
```

---

## Motion Testing (Cosmetic Only)

### ✅ 7. Motion Assignment

**Objective**: Verify cosmetic motion is applied correctly without affecting physics.

**Test Steps**:
1. Generate level and apply motion with 30% density
2. Verify motion parameters are within fairness constraints
3. Check clustering behavior for group motion
4. Confirm motion is render-only (no physics impact)

**Acceptance Criteria**:
- [ ] Motion density respected (±5% tolerance)
- [ ] Amplitude ≤ 15% of peg radius (≤ 0.01875 units)
- [ ] Frequency ≤ 0.15 (slow, subtle motion)
- [ ] Clusters formed with staggered phases
- [ ] Motion types distributed: oscillate and pulse
- [ ] No motion assigned to orange pegs in critical positions

**Evidence Required**:
```typescript
// Motion assignment test
const level = generateSlopeggleLevel({ seed: "motion-test", difficultyTier: "medium" });
const result = applyPegMotion(level, { motionDensity: 0.3, seed: 12345 });
console.log(`Motion stats: ${result.stats.pegsWithMotion}/${result.stats.totalPegs} pegs`);
console.log(`Clusters: ${result.stats.clustersFormed}`);
```

---

### ✅ 8. Fairness Verification

**Objective**: Ensure motion doesn't provide gameplay advantage/disadvantage.

**Test Steps**:
1. Generate identical level with and without motion
2. Verify peg collision positions remain unchanged
3. Check amplitude and frequency constraints
4. Test that ball physics simulation produces same results

**Acceptance Criteria**:
- [ ] Peg anchor positions identical with/without motion
- [ ] Motion amplitude ≤ 12% of peg radius (default constraint)
- [ ] Motion frequency ≤ 0.15 (slow oscillation)
- [ ] Ball collision detection uses fixed anchor positions
- [ ] No motion on critical gameplay elements (launcher, bucket path)

**Evidence Required**:
```typescript
// Fairness verification
const baseLevel = generateSlopeggleLevel({ seed: "fairness-test", difficultyTier: "medium" });
const motionLevel = applyPegMotion(baseLevel, { motionDensity: 0.3, seed: 999 });

// Verify anchor positions unchanged
const anchorsSame = baseLevel.pegs.every((peg, i) => 
  peg.x === motionLevel.overlay.pegs[i].x && peg.y === motionLevel.overlay.pegs[i].y
);
console.log(`Anchor positions preserved: ${anchorsSame}`);
```

---

## Loader Testing

### ✅ 9. Pack Loading

**Objective**: Verify level packs load correctly from bundled and remote sources.

**Test Steps**:
1. Create test pack with 3 generated levels
2. Save as JSON file in bundled assets
3. Load pack using `LevelLoader.loadBundled()`
4. Test remote loading with mock HTTP endpoint
5. Verify composite source fallback behavior

**Acceptance Criteria**:
- [ ] Bundled packs load without errors
- [ ] Remote packs fetch and parse correctly
- [ ] Schema version warnings generated for mismatches
- [ ] Composite source tries sources in order
- [ ] Loading errors provide actionable messages
- [ ] Pack metadata preserved during loading

**Evidence Required**:
```typescript
// Pack loading test
const loader = new LevelLoader();
try {
  const pack = await loader.loadBundled('slopeggle-test-pack');
  console.log(`Loaded pack: ${pack.metadata.name} with ${pack.levels.length} levels`);
} catch (error) {
  console.error(`Loading failed: ${error.message}`);
}
```

---

### ✅ 10. Level Merging

**Objective**: Verify level overlays merge correctly onto base game definitions.

**Test Steps**:
1. Load test pack with Slopeggle levels
2. Apply level to base Slopeggle game using `applyLevel()`
3. Verify game-specific overrides are applied
4. Check entity merging and metadata updates
5. Test error handling for invalid overlays

**Acceptance Criteria**:
- [ ] Level difficulty parameters applied to game (initialLives, etc.)
- [ ] Slopeggle overrides merged correctly (worldWidth, hasBucket, hasPortals)
- [ ] Game metadata updated with level title and generator info
- [ ] Entity replacement works for matching IDs
- [ ] Merge warnings generated for conflicts
- [ ] Invalid overlays handled gracefully (no crashes)

**Evidence Required**:
```typescript
// Level merging test
const pack = await loader.loadBundled('slopeggle-test-pack');
const baseGame = await loadBaseSlopeggleGame(); // Mock base game
const result = loader.applyLevel(pack, 0, baseGame, { validate: true });
console.log(`Merged game: ${result.game.metadata.title}`);
console.log(`Lives: ${result.game.initialLives}`);
console.log(`Warnings: ${result.warnings.mergeWarnings.length}`);
```

---

## Integration Testing

### ✅ 11. End-to-End Workflow

**Objective**: Test complete pipeline from generation to playable game.

**Test Steps**:
1. Generate Slopeggle level with motion
2. Create level pack with multiple levels
3. Save pack to bundled assets
4. Load pack and apply to base game
5. Verify resulting game is playable

**Acceptance Criteria**:
- [ ] Complete pipeline executes without errors
- [ ] Generated levels load and merge successfully
- [ ] Motion parameters converted to game behaviors
- [ ] Resulting game definition is valid and complete
- [ ] Performance acceptable for real-time generation
- [ ] Memory usage reasonable for mobile devices

**Evidence Required**:
```typescript
// End-to-end test
const seeds = ["e2e-1", "e2e-2", "e2e-3"];
const levels = seeds.map(seed => {
  const level = generateSlopeggleLevel({ seed, difficultyTier: "medium" });
  return applyPegMotion(level, { motionDensity: 0.2, seed: hashSeed(seed) });
});

const pack = createLevelPack({
  packId: "e2e-test-pack",
  levels: levels.map(l => l.overlay),
});

// Test loading and merging
const loader = new LevelLoader();
const baseGame = await loadBaseSlopeggleGame();
const result = loader.applyLevel(pack, 0, baseGame);
console.log(`E2E Success: ${result.game.metadata.title} ready to play`);
```

---

### ✅ 12. Performance Benchmarks

**Objective**: Ensure generation performance meets real-time requirements.

**Test Steps**:
1. Generate 100 levels with different seeds and difficulties
2. Measure generation time per level
3. Test memory usage during batch generation
4. Verify performance on mobile-class hardware

**Acceptance Criteria**:
- [ ] Level generation < 50ms per level (average)
- [ ] Motion assignment < 20ms per level (average)
- [ ] Pack loading < 100ms for 10-level pack
- [ ] Memory usage < 10MB for 100 generated levels
- [ ] No memory leaks during repeated generation
- [ ] Performance consistent across difficulty tiers

**Evidence Required**:
```typescript
// Performance benchmark
const startTime = performance.now();
const levels = [];
for (let i = 0; i < 100; i++) {
  const level = generateSlopeggleLevel({ 
    seed: `perf-${i}`, 
    difficultyTier: ["easy", "medium", "hard"][i % 3] 
  });
  levels.push(level);
}
const endTime = performance.now();
console.log(`Generated 100 levels in ${endTime - startTime}ms`);
console.log(`Average: ${(endTime - startTime) / 100}ms per level`);
```

---

## Acceptance Criteria Summary

### 🎯 Critical Requirements (Must Pass)

1. **Determinism**: Same seed → identical output (100% reproducible)
2. **Schema Compliance**: All levels pass `isLevelDefinition()` validation
3. **Bounds Safety**: No out-of-bounds pegs or forbidden zone violations
4. **Accessibility**: Minimum orange pegs reachable from launcher
5. **Motion Fairness**: Amplitude ≤ 15% radius, frequency ≤ 0.15
6. **Loading Success**: Packs load and merge without errors

### 🔍 Quality Requirements (Should Pass)

1. **Difficulty Progression**: Clear scaling across tiers
2. **Seed Variation**: Meaningful differences between seeds
3. **Performance**: <50ms generation, <100ms loading
4. **Error Handling**: Graceful failure with actionable messages

### 📊 Metrics Targets

- **Generation Speed**: <50ms per level
- **Motion Assignment**: <20ms per level  
- **Pack Loading**: <100ms for 10 levels
- **Memory Usage**: <10MB for 100 levels
- **Determinism**: 100% reproducible
- **Accessibility**: ≥50% oranges reachable (medium difficulty)

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm build:shared

# Run TypeScript checks
pnpm tsc --noEmit
```

### Test Data

Create test pack in `shared/src/loader/__examples__/qa-test-pack.json`:

```json
{
  "schemaVersion": 1,
  "metadata": {
    "packId": "slopeggle-qa-test",
    "name": "QA Test Pack",
    "description": "Test pack for manual QA verification"
  },
  "version": "1.0.0",
  "levels": [
    // Generated levels for testing
  ]
}
```

### Validation Scripts

```typescript
// qa-validation.ts - Run all QA checks
import { runDeterminismTests } from './tests/determinism';
import { runBoundsTests } from './tests/bounds';
import { runAccessibilityTests } from './tests/accessibility';
import { runMotionTests } from './tests/motion';
import { runLoaderTests } from './tests/loader';

async function runQAChecklist() {
  console.log("🔍 Running Slopeggle Level Generator QA Checklist...\n");
  
  const results = {
    determinism: await runDeterminismTests(),
    bounds: await runBoundsTests(),
    accessibility: await runAccessibilityTests(),
    motion: await runMotionTests(),
    loader: await runLoaderTests(),
  };
  
  const passed = Object.values(results).filter(r => r.passed).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ QA Results: ${passed}/${total} test suites passed`);
  
  if (passed === total) {
    console.log("🎉 All QA checks passed! System ready for production.");
  } else {
    console.log("❌ Some QA checks failed. Review results above.");
  }
}
```

---

## Sign-Off

**QA Engineer**: _________________ **Date**: _________

**Technical Lead**: _________________ **Date**: _________

**Product Owner**: _________________ **Date**: _________

---

*This checklist covers the complete Slopeggle Level Generator system (Waves 1-4). All checks must pass before system deployment.*