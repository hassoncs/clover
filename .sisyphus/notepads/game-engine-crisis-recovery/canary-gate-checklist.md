# Game Engine Crisis Recovery - Canary Gate Checklist

## Overview
This checklist verifies the game engine is stable after the crisis recovery work.

## Quick Verification

Run these commands to verify the engine is working:

```bash
# 1. Run all tests
pnpm test

# 2. Type check
pnpm tsc --noEmit

# 3. Build
pnpm build
```

## Expected Results

### Test Results
- [ ] **slopcade (app) tests**: 23+ test files pass
- [ ] **Total tests**: 486+ passing
- [ ] **Known failures**: 7 pre-existing ScriptSandboxRuntimeSystem tests (unrelated to recovery)

### Critical Bugs Fixed
- [x] **Empty collisions** - Now reads from `ctx.frame.collisions`
- [x] **Zero velocity** - Now reads from `physics.getLinearVelocity()`
- [x] **Empty inputEvents** - Now converts from `ctx.frame.inputEvents`
- [x] **Console spam** - Gated behind debug flag

### Canary Games Status

#### breakoutScripted
- [x] Game definition loads
- [x] Has ball, paddle templates
- [x] Script is defined
- [ ] Input events trigger script hooks
- [ ] Collision hooks fire

#### slopeggle
- [x] Game definition loads
- [x] Has ball, bluePeg, orangePeg templates
- [x] Physics world configured
- [ ] Ball launches on input
- [ ] Collisions register

#### breakoutBouncer
- [x] Game definition loads
- [x] Has ball, paddle, brickRed templates
- [x] Physics world configured
- [ ] Behaviors execute
- [ ] Collisions trigger score

## Architecture Changes

### Phase 0: Stabilization
1. **FrameData pattern** - Added `frame` buffer to `UpdateContext`
2. **Runner ownership** - GameSystemRunner owns/resets frame buffers
3. **Phase contracts** - Documented producer/consumer relationships
4. **Wiring fixes** - Moved collection into runner integration

### Wave 1: TDD Regression Net
- 32+ new tests for wiring verification
- Tests for collisions → behaviors
- Tests for velocity in eval context
- Tests for InputEvents → rules
- Tests for collisions → rules

### Wave 2: Canary Verification
- Smoke tests for all canary games
- Input consolidation verified
- No console spam in production

## Debug Commands

```bash
# Run specific test file
pnpm test -- --run lib/game-engine/systems/runner/__tests__/GameSystemRunner.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose

# Run only failed tests
pnpm test -- --run --onlyFailures
```

## Known Issues

1. **ScriptSandboxRuntimeSystem tests** - 7 pre-existing failures (not related to recovery)
2. **API tests** - May fail due to connection issues (unrelated to game engine)

## Sign-Off

- [ ] All critical bugs fixed
- [ ] All canary games load successfully
- [ ] Test suite passes (excluding known failures)
- [ ] No regressions in existing functionality
