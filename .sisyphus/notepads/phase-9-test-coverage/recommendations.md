# Test Coverage Recommendations

**Date:** 2026-01-31

---

## 🎯 Phase 9 Priorities (Immediate)

### 1. GameRuntime.godot.tsx Tests (CRITICAL)

**Why:** 62KB main orchestrator with 0% coverage

**Test file:** `app/lib/game-engine/__tests__/GameRuntime.test.tsx`

**What to test:**
```typescript
describe('GameRuntime', () => {
  describe('System Initialization', () => {
    it('should initialize all systems in correct order')
    it('should pass correct config to each system')
    it('should handle initialization errors gracefully')
  })

  describe('Update Loop', () => {
    it('should execute systems in phase order')
    it('should pass correct update context')
    it('should handle update errors without crashing')
  })

  describe('Bridge Integration', () => {
    it('should initialize bridge before systems')
    it('should sync transforms after physics')
    it('should handle bridge disconnection')
  })

  describe('Lifecycle', () => {
    it('should cleanup all systems on unmount')
    it('should unsubscribe from all events')
    it('should destroy bridge connection')
  })
})
```

**Estimated effort:** 4-6 hours

---

### 2. RuntimeSystem Wrapper Tests (11 missing)

**Why:** New architecture from Phase 8, each wrapper is a failure point

**Template test file:** `app/lib/game-engine/systems/runner/__tests__/RuntimeSystemTemplate.test.ts`

**Create template, then copy for each wrapper:**
```typescript
describe('[SystemName]RuntimeSystem', () => {
  let system: [SystemName]RuntimeSystem;
  let mockContext: SystemContext;
  let mockUpdateContext: UpdateContext;

  beforeEach(() => {
    system = new [SystemName]RuntimeSystem();
    mockContext = createMockContext();
    mockUpdateContext = createMockUpdateContext();
  });

  describe('initialization', () => {
    it('should have correct id, phase, and priority')
    it('should initialize with config')
    it('should create underlying system')
  })

  describe('update', () => {
    it('should call underlying system update')
    it('should pass correct context')
    it('should handle errors gracefully')
  })

  describe('state', () => {
    it('should return current state')
    it('should track execution count')
  })

  describe('destroy', () => {
    it('should cleanup resources')
    it('should reset state')
  })
})
```

**Systems to test:**
1. CameraRuntimeSystem
2. ComputedValuesRuntimeSystem
3. ContainerRuntimeSystem
4. EntityManagerRuntimeSystem
5. InputRuntimeSystem
6. Match3RuntimeSystem
7. PropertySyncRuntimeSystem
8. RulesRuntimeSystem
9. SlotMachineRuntimeSystem
10. TweenRuntimeSystem
11. ViewportRuntimeSystem

**Estimated effort:** 1-2 hours per system (11-22 hours total)

**Optimization:** Create template test, then use find/replace for each system

---

### 3. CameraSystem Tests

**Why:** Used in every game, complex logic, 13KB file

**Test file:** `app/lib/game-engine/__tests__/CameraSystem.test.ts`

**What to test:**
```typescript
describe('CameraSystem', () => {
  describe('Camera Modes', () => {
    it('should support fixed camera')
    it('should support follow camera')
    it('should support follow-x camera')
    it('should support follow-y camera')
  })

  describe('Target Following', () => {
    it('should smoothly follow target')
    it('should respect follow speed')
    it('should handle target destruction')
  })

  describe('Bounds Clamping', () => {
    it('should clamp camera to world bounds')
    it('should handle bounds smaller than viewport')
  })

  describe('Zoom Control', () => {
    it('should set zoom level')
    it('should smoothly transition zoom')
  })
})
```

**Estimated effort:** 3-4 hours

---

## 📅 Phase 10 Priorities (Short-term)

### 1. Integration Tests

**Why:** All current tests are unit tests with mocks

**Test files:**
- `app/lib/game-engine/__tests__/integration/BridgeEntityManager.test.ts`
- `app/lib/game-engine/__tests__/integration/BridgePhysics.test.ts`
- `app/lib/game-engine/__tests__/integration/FullGameLoop.test.ts`

**What to test:**
- Bridge + EntityManager (spawn, destroy, transform sync)
- Bridge + Physics (collision events, force application)
- Full game loop (all systems working together)

**Estimated effort:** 8-12 hours

---

### 2. Behavior Tests

**Why:** Most behavior types have 0% coverage

**Test files:**
- `app/lib/game-engine/__tests__/behaviors/VisualBehaviors.test.ts`
- `app/lib/game-engine/__tests__/behaviors/TweenBehaviors.test.ts`
- `app/lib/game-engine/__tests__/behaviors/LifecycleBehaviors.test.ts`

**What to test:**
- Rotate, oscillate, follow behaviors
- Tween position, scale, opacity
- OnSpawn, onDestroy, onCollision hooks

**Estimated effort:** 6-8 hours

---

### 3. UI Overlay Tests

**Why:** Input overlays are critical for mobile

**Test files:**
- `app/lib/game-engine/__tests__/InputDebugOverlay.test.tsx`
- `app/lib/game-engine/__tests__/VirtualDPadOverlay.test.tsx`
- `app/lib/game-engine/__tests__/VirtualJoystickOverlay.test.tsx`

**What to test:**
- Rendering
- Touch event handling
- Input state updates

**Estimated effort:** 4-6 hours

---

## 🔮 Long-term Priorities

### 1. E2E Tests

**Why:** Verify full game scenarios work

**Test files:**
- `app/__tests__/e2e/Pinball.test.ts`
- `app/__tests__/e2e/Slopeggle.test.ts`
- `app/__tests__/e2e/AngryBurns.test.ts`

**What to test:**
- Load game
- Play through scenario
- Verify win/lose conditions
- Check performance

**Estimated effort:** 12-16 hours

---

### 2. Visual Regression Tests

**Why:** Catch rendering bugs

**Tool:** Playwright + screenshot comparison

**What to test:**
- Game screenshots at key moments
- UI overlay rendering
- Camera transitions

**Estimated effort:** 8-12 hours

---

### 3. Performance Tests

**Why:** Ensure scalability

**Test files:**
- `app/__tests__/performance/ManyEntities.test.ts`
- `app/__tests__/performance/ComplexPhysics.test.ts`

**What to test:**
- 1000+ entities
- Complex collision scenarios
- Frame timing consistency

**Estimated effort:** 8-12 hours

---

## 🛠️ Testing Infrastructure Improvements

### 1. Test Utilities

**Create:**
- `app/lib/game-engine/__tests__/utils/mockContext.ts` - Reusable mock context
- `app/lib/game-engine/__tests__/utils/mockBridge.ts` - Reusable mock bridge
- `app/lib/game-engine/__tests__/utils/testHelpers.ts` - Common test helpers

**Estimated effort:** 2-3 hours

---

### 2. Test Coverage Reporting

**Setup:**
- Configure Vitest coverage
- Add coverage thresholds
- Add coverage to CI

**Estimated effort:** 1-2 hours

---

### 3. Test Documentation

**Create:**
- `docs/testing/README.md` - Testing guide
- `docs/testing/writing-tests.md` - How to write tests
- `docs/testing/running-tests.md` - How to run tests

**Estimated effort:** 2-3 hours

---

## 📊 Effort Summary

### Phase 9 (Immediate)
- GameRuntime tests: 4-6 hours
- RuntimeSystem wrapper tests: 11-22 hours
- CameraSystem tests: 3-4 hours
- **Total: 18-32 hours**

### Phase 10 (Short-term)
- Integration tests: 8-12 hours
- Behavior tests: 6-8 hours
- UI overlay tests: 4-6 hours
- **Total: 18-26 hours**

### Long-term
- E2E tests: 12-16 hours
- Visual regression: 8-12 hours
- Performance tests: 8-12 hours
- **Total: 28-40 hours**

### Infrastructure
- Test utilities: 2-3 hours
- Coverage reporting: 1-2 hours
- Documentation: 2-3 hours
- **Total: 5-8 hours**

---

## 🎯 Recommended Approach

### Week 1: Critical Gaps
1. GameRuntime tests (1 day)
2. RuntimeSystem wrapper template (0.5 day)
3. 5 RuntimeSystem wrapper tests (2.5 days)
4. CameraSystem tests (0.5 day)

### Week 2: More Wrappers + Integration
1. 6 remaining RuntimeSystem wrapper tests (3 days)
2. Integration tests (2 days)

### Week 3: Behaviors + UI
1. Behavior tests (1.5 days)
2. UI overlay tests (1 day)
3. Test utilities (0.5 day)

### Week 4: Long-term + Infrastructure
1. E2E tests (2 days)
2. Coverage reporting (0.5 day)
3. Documentation (0.5 day)

---

## ✅ Success Criteria

### Phase 9 Complete When:
- [ ] GameRuntime has >80% coverage
- [ ] All 13 RuntimeSystem wrappers have tests
- [ ] CameraSystem has >70% coverage
- [ ] No critical gaps remain

### Phase 10 Complete When:
- [ ] Integration tests exist for Bridge + Systems
- [ ] All behavior types have tests
- [ ] UI overlays have tests
- [ ] Coverage >50% overall

### Long-term Complete When:
- [ ] E2E tests for all test games
- [ ] Visual regression tests in place
- [ ] Performance benchmarks established
- [ ] Coverage >70% overall
