# Skill Index

Generated: 2026-02-12

## By Category

### Chat & AI
- [agent-orchestration](agent-orchestration.md) - Chat streaming, SSE, AG-UI protocol, HITL, billing

### Bridge & Engine
- [bridge-development](bridge-development.md) - Godot-TypeScript bridge, method registration, dispatch
- [input-handling](input-handling.md) - Web/native input, touch, drag, gestures
- [game-inspector](game-inspector.md) - MCP tools, debugging, entity inspection

### Game Systems
- [ecs-architecture](ecs-architecture.md) - Prefabs, entities, components, GameDefinition, rules, behaviors
- [game-authoring](game-authoring.md) - Creating games, prefabs, entities, behaviors
- [economy-engine](economy-engine.md) - Resource graphs, pools, economy simulation
- [effects-system](effects-system.md) - Multi-pass shaders, feedback, visual effects

### Storage & Infrastructure
- [storage-ops](storage-ops.md) - D1, R2, Supabase auth, migrations, BlobStore

### Testing
- [testing-patterns](testing-patterns.md) - Vitest, GDUnit4, tRPC testing, D1/R2 mocking, E2E bridge

### Assets & Generation
- [asset-pack-generation](asset-pack-generation.md) - Image generation, pipelines, silhouettes

## Recently Updated

| Skill | Date | Changes |
|-------|------|---------|
| agent-orchestration | 2026-02-12 | Created — covers chat streaming, HITL, billing |
| storage-ops | 2026-02-12 | Created — covers D1, R2, Supabase, migrations |
| testing-patterns | 2026-02-12 | Created — covers Vitest, GDUnit4, bridge E2E |
| ecs-architecture | 2026-02-12 | Created — covers prefabs, entities, rules, behaviors |
| bridge-development | 2026-02-11 | Created from BRIDGE_REFACTOR.md |
| economy-engine | 2026-02-11 | Created from ENGINE_GUIDE.md |
| effects-system | 2026-02-11 | Created from EFFECTS_ARCHITECTURE.md |
| input-handling | 2026-02-11 | Created from WEB_INPUT_HANDLING.md |
| game-inspector | 2026-02-11 | Created from unified-input-simulation-plan.md |

## Coverage Report

| Category | Skills | Status |
|----------|--------|--------|
| Chat & AI | 1 | ✅ agent-orchestration covers streaming + billing |
| Bridge & Engine | 3 | ⚠️ 50% - Needs coordinate-systems, native-image-loading |
| Game Systems | 4 | ✅ 80% - ECS + authoring + economy + effects |
| Storage | 1 | ✅ D1/R2/Supabase covered |
| Testing | 1 | ✅ Vitest/GDUnit4/E2E covered |
| Assets | 1 | ⚠️ 25% - Needs sound-generation |
| Expo/Native | 0 | 🔴 0% - Needs expo-native, cocoapods |

## Remaining Gaps (P1/P2)

P1 (High):
1. `godot-engine.md` - GDScript patterns, scene composition, signals
2. `physics-rapier.md` - Collision layers, body types, constraints
3. `rules-behaviors.md` - Declarative rules, behavior overrides (partially in ecs-architecture)

P2 (Medium):
4. `native-infrastructure.md` - CocoaPods, Metro port 8085, Android Gradle
5. `economy-iap.md` - Stripe/Apple/Google IAP, credit system
6. `transcription-do.md` - Whisper STT, Durable Objects
7. `sound-generation.md` - Audio asset pipeline

## Skill Quality Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Total skills | 15-25 | 10 |
| Avg code examples per skill | 3+ | 4+ ✅ |
| Avg gotchas per skill | 2+ | 3+ ✅ |
| Skills with quick reference | 100% | 100% ✅ |
| Cross-linked skills | 80% | 60% |
