# Skill Index

Updated: 2026-02-12 (post-audit)

> All skills verified against source via grep. No fabricated types/interfaces remain.

## By Category

### Chat & AI
- [ai-sdk-usage](ai-sdk-usage.md) - **OpenRouter + Vercel AI SDK patterns, model selection, hush secrets** (MUST USE for any AI/LLM calls)
- [agent-orchestration](agent-orchestration.md) - Chat streaming, SSE, AG-UI protocol, HITL, billing
- [ai-game-generation](ai-game-generation.md) - AI agent execution engine, game generation stages, asset pipeline

### Editor & UI
- [editor-system](editor-system.md) - Dockview layouts, panels, CodeMirror editor, EditorContextValue
- [editor-browser-testing](editor-browser-testing.md) - Agent-browser testing: dev auth, a11y landmarks, content mirrors, chat flow

### Social & Community
- [social-features](social-features.md) - 7 services (Comment, Rating, Follow, Bookmark, Block, Notification, Report)

### Auth & Users
- [auth-system](auth-system.md) - Supabase auth, platform-specific storage, dev mode, tRPC context
- [admin-access](admin-access.md) - Admin procedure, ADMIN_EMAILS configuration, access control

### Godot & Bridge
- [godot-engine](godot-engine.md) - GDScript patterns, scene composition, exports, coordinate system
- [physics](physics.md) - Physics bodies, collision, joints, world settings, PPM
- [bridge-development](bridge-development.md) - Dual dispatch (method + query), auto-registration, web vs native
- [input-handling](input-handling.md) - Web/native input, touch, drag, coordinate flow
- [game-inspector](game-inspector.md) - 46 MCP operations for debugging, inspection, input simulation

### Game Systems
- [ecs-architecture](ecs-architecture.md) - Prefabs, entities, components, GameDefinition, scriptRef
- [game-authoring](game-authoring.md) - Creating games: prefabs, entities, scripts
  - [game-authoring/game-definition-reference](game-authoring/game-definition-reference.md) - Complete field-by-field GameDefinition reference
  - [game-authoring/scripting-api-reference](game-authoring/scripting-api-reference.md) - QuickJS ScriptContext API, lifecycle hooks
  - [game-authoring/examples](game-authoring/examples.md) - Patterns from production games
  - [game-authoring/bundling-and-shaders](game-authoring/bundling-and-shaders.md) - Bundle format, build pipeline, shader system
- [economy-engine](economy-engine.md) - Machinations graph engine, pools, flows, EconomySimulator
- [effects-system](effects-system.md) - Multi-pass shader graphs, ping-pong feedback, GraphExecutor

### Validation & Packaging
- [game-validation](game-validation.md) - 3-layer validation pipeline, 36+ error codes, scoring
- [game-package](game-package.md) - PackageCompiler, PackageValidator, ReadinessService, game-bundler

### Storage & Infrastructure
- [storage-ops](storage-ops.md) - D1 (raw SQL), R2 via BlobStore, Supabase auth sync
- [native-infrastructure](native-infrastructure.md) - Metro port 8085, CocoaPods, Expo plugins, preflight
- [workspace-system](workspace-system.md) - GameRepoDO, GitService, ForkService, R2Fs, isomorphic-git

### Economy & IAP
- [economy-iap](economy-iap.md) - Sparks/Gems currency, wallet transactions, RevenueCat IAP

### Assets & Audio
- [asset-pack-generation](asset-pack-generation.md) - Scenario.com image pipeline, silhouette-to-sprite, BlobStore
- [sound-generation](sound-generation.md) - ElevenLabs SFX, GameDefinition sounds, AudioManager

### Voice & Real-time
- [transcription-do](transcription-do.md) - Whisper STT via RealtimeRelayDO, GameRepoDO for git-on-R2

### Testing
- [testing-patterns](testing-patterns.md) - Vitest, GDUnit4, tRPC createCaller, D1/R2 mocking

## Totals

- **25 skill files** (21 top-level + 4 game-authoring sub-skills)
- All file paths verified via glob
- All type signatures verified via grep/read of actual source
- Dead cross-links fixed (coordinate-systems.md, shaders.md, rules-system.md removed)
