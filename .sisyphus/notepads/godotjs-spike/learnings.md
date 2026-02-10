
## [2026-02-10 08:57] Task 0: Create Worktree
- Worktree created at: `.worktrees/spike/godotjs/`
- Branch: `spike/godotjs`
- Full path: `/Users/hassoncs/Workspaces/Personal/slopcade/.worktrees/spike/godotjs/`
- Status: SUCCESS
- Environment files copied: `.envrc`, `.envrc.backup`
- `.gitignore` already includes `.worktrees/` (line 144)
- Verified full project structure present in worktree

## [2026-02-10] Task 1: Download & Verify GodotJS Editor

### GodotJS Release Structure
- v1.0.0 has NO binary assets (source-only release)
- Binary builds are in v1.1.0-* prerelease tags (e.g., v1.1.0-editor2)
- Builds come in variants: `qjs-ng` (QuickJS) and `v8` (V8 engine)
- macOS builds: `macos-editor-app-{godot_version}-v8.zip` (proper .app bundle)
- Available Godot versions: 4.4 and 4.5

### Version Compatibility
- **Godot 4.4 build (v4.4.2.rc)**: Rapier2D addon FAILS - compiled for Godot 4.5
  - Error: `gdext was compiled against newer Godot version: v4.5.stable.official but loaded by older Godot binary`
  - GDScript files also fail because class_name types from Rapier2D aren't available
- **Godot 4.5 build (v4.5.2.rc)**: ✅ SUCCESS - Rapier2D loads, all GDScript files parse

### GodotJS Integration Confirmed
- `[JS] jsb.inject loaded successfully` — JS runtime initializes
- JS files in export/web/ are detected and loaded (AudioWorklet files fail as expected in non-web context)
- GodotJS adds `jsb` module for JS/GDScript interop

### Project Load Results (Godot 4.5 build)
- ✅ Rapier2D physics engine loads: `PHYSICS ENGINE 2D: Rapier2D v0.8.25`
- ✅ GameBridge autoload initializes: `[GameBridge] _ready() starting...`
- ✅ 103 bridge methods registered
- ✅ All subsystems initialize (EntityManager, PhysicsController, JointManager, etc.)
- ✅ Main.gd sets game_root on GameBridge successfully
- ⚠️ Minor: camera-texture GDExtension missing (macOS dylib not present) — non-fatal
- ⚠️ Minor: CameraController.setup_camera has property assignment error (camera type mismatch) — non-fatal
- ⚠️ RID leaks on exit (10 Canvas, 10 Viewport, 10 Texture) — normal for headless quit

### Binary Location
- 4.4: `~/tools/godotjs/macos-editor-app-4.4-v8/Godot.app`
- 4.5: `~/tools/godotjs/macos-editor-app-4.5-v8/Godot.app` ← USE THIS ONE

## [2026-02-10 09:01] Task 2: react-native-godot Research
- Package uses stock Godot: no
- Custom builds supported: yes
- Key findings: 
  - Built on LibGodot (https://github.com/migeran/libgodot) - Migeran's fork of Godot 4.5
  - Uses version "4.5.1.migeran.2" - NOT stock Godot, but Migeran-modified version
  - Prebuilt binaries downloaded separately from Migeran's GitHub releases (not via npm)
  - Full documentation on using custom LibGodot builds via environment variables
  - Users can clone LibGodot repo, build from source, and override download logic
  - Core integration point: react-native-worklets-core for threading (running Godot on separate thread)

## [2026-02-10] Task 3: EntityManager.ts Port

### Files Created
- `godot_project/scripts/entity/EntityManager.ts` — Main ported file (222 lines)
- `godot_project/typings/godot.minimal.d.ts` — Minimal Godot API type stubs
- `godot_project/tsconfig.json` — TypeScript config for GodotJS compilation

### Methods Ported (6 core + 4 JS handlers + helpers)
1. `register_entity(entity_id, node)` — Add entity to map
2. `unregister_entity(entity_id)` — Remove entity from map
3. `spawn_entity(template_id, x, y, entity_id, initial_velocity_json)` — Full spawn with velocity support
4. `destroy_entity(entity_id)` — Remove + queue_free + notify bridge
5. `get_entity_transform(entity_id)` — Godot→game coordinate conversion
6. `get_all_entity_ids()` — Return all tracked entity IDs
7. `_js_get_all_bodies`, `_js_spawn_entity`, `_js_destroy_entity`, `_js_get_entity_transform` — Bridge handlers

### GodotJS Syntax Patterns Used
- `export default class EntityManager extends RefCounted` (GodotJS class pattern)
- `import { Node, Node2D, RefCounted, Vector2, is_instance_valid } from "godot"` (Godot API imports)
- Used `Map<string, Node2D>` instead of GDScript `Dictionary` for type safety
- Used native `JSON.parse()` instead of Godot's `JSON` class for velocity parsing
- Coordinate conversion inlined (same math as CoordinateUtils.gd)

### GodotJS Syntax Challenges
- **No constructor**: GodotJS warns against explicit constructors in RefCounted subclasses. Used `init(bridge)` method instead of `_init(bridge)`.
- **Type stubs needed**: GodotJS "Install Preset Files" is GUI-only. Created minimal `godot.minimal.d.ts` for tsc verification.
- **console not in ESNext lib**: GodotJS provides `console` globally but TypeScript's ESNext lib doesn't include it. Added `declare var console` to type stubs.
- **typeRoots gotcha**: Empty `typings/gdscript/` directory caused tsc error. Fixed by using `"typeRoots": [], "types": []` in tsconfig.
- **`as any` for bridge access**: Bridge properties like `templates`, `entity_registry` are dynamic GDScript properties. Used `as any` cast for cross-language boundary access.

### Key Differences from GDScript Version
- Uses `Map<string, Node2D>` instead of `Dictionary` (better type safety)
- Uses native `JSON.parse()` instead of Godot's `JSON` class
- `init()` method instead of `_init()` constructor (GodotJS CDO safety)
- Private methods use TypeScript `private` keyword instead of `_` prefix convention
- Return types are explicit (`EntityTransform | null` instead of `Variant`)

### Status: SUCCESS
- `tsc --noEmit` passes with zero errors
- EntityManager.gd preserved as fallback
- GameBridge.gd not modified

## [2026-02-10] Task 4a: TypeScript Compilation

### tsc --noEmit: PASS
- Zero errors with ESNext module format
- tsconfig uses `noEmit: true` for type-checking only (esbuild handles compilation)

### GodotJS editor recognizes TS: YES (with caveats)
- `global_script_class_cache.cfg` registers the TS file as `"language": &"GodotJSScript"`
- GodotJS auto-discovers `.ts` files in the project and registers them as script classes
- The class IS recognized as a GodotJS class (not a "stub script") when compiled with esbuild

### .js files generated: YES
- esbuild compiles to `.godot/GodotJS/scripts/entity/EntityManager.js`
- Must use esbuild (not tsc) for compilation — this is the official GodotJS toolchain
- esbuild settings: `--format=cjs --target=esnext --outbase=. --outdir=.godot/GodotJS`

### CRITICAL ISSUE: Editor crashes on startup
- **Error**: `FATAL: Condition "!(has_method(p_method))" is true` at `jsb_script.cpp:347`
- **Root cause**: GodotJS's `get_method_info()` asserts that a method exists before returning info. When the editor scans the TS class and checks for a method that doesn't exist, it crashes instead of gracefully handling the missing method.
- **This is a GodotJS bug** — it should return false/empty, not crash with SIGABRT
- The crash happens during editor startup script scanning, before any game code runs
- Recovery mode (`--recovery-mode`) does NOT help — crash happens before editor UI loads

### Compilation Toolchain Discovery
- **Official GodotJS uses esbuild, NOT tsc for compilation**
  - Source: `godot-ts` tool (https://github.com/godotjs/godot-ts)
  - esbuild config: `format: "cjs"`, `target: "esnext"`, outdir: `.godot/GodotJS`
  - tsc is used ONLY for type-checking (`noEmit: true`)
- **Module format matters**:
  - ESNext modules → "Cannot use import statement outside a module" (V8 doesn't support ESM)
  - CommonJS via tsc → `exports.default = X` (GodotJS sees "stub script")
  - CommonJS via esbuild → `__toCommonJS` wrapper (GodotJS recognizes the class)
- **tsconfig should match official GodotJS template**:
  - `"module": "ESNext"` (for type-checking)
  - `"noEmit": true` (tsc only type-checks)
  - `"typeRoots": ["./typings"]`
  - Compilation done separately via esbuild

### Next Steps Needed
1. Run "Install Preset Files" from GodotJS editor GUI to get proper type definitions
   - This generates full Godot API `.d.ts` files (not our minimal stubs)
   - May also set up the class registration system properly
2. The `has_method` crash may be related to missing GodotJS preset files
3. Consider if the TS class needs GodotJS-specific decorators for method registration
4. The `as any` casts in EntityManager.ts may need to be replaced with proper GodotJS bridge types
