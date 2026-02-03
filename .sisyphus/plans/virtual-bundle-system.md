# Virtual Bundle System

## TL;DR

> **Quick Summary**: Refactor the bundle compiler to support both real and virtual file systems, enabling AI-generated content to flow through the same pipeline as local development. Add JavaScript script file support alongside JSON files. Design asset manifest to support both remote URLs and local files for offline-capable bundles.
> 
> **Deliverables**:
> - FileReader interface abstraction with NodeFileReader and VirtualFileReader implementations
> - Bundle compiler extended to scan and process both `.json` and `.js` files
> - Updated types for RawBundleData with scripts field
> - Asset manifest supporting remote URLs OR local `assets/` directory
> - Build script updated to compile `script.ts` → `scripts/game.js`
> - Test coverage for virtual bundle compilation
> 
> **Estimated Effort**: Large (25-35 focused hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (Interface) → Task 2 (Refactor Compiler) → Task 4 (Script Scanning) → Task 8 (Integration Tests)

---

## Context

### Original Request
Create a unified bundle system that:
1. Handles both JSON and JavaScript files (not just JSON)
2. Supports virtual file system (in-memory) for AI-generated content
3. Works in production (not just build-time)
4. Enables AI to write to virtual FS and have it flow through same pipeline as real files
5. Local TypeScript dev compiles to same bundle format
6. No more escaped strings for scripts - proper file separation
7. Asset manifest supports both remote URLs and local files for offline capability
8. Design enables future zip bundle + CDN distribution

### Interview Summary
**Key Discussions**:
- Bundle compiler uses direct `fs.readFileSync` - no abstraction layer
- Scripts embedded as escaped template literals in game.ts (terrible DX)
- Archive bundles show `.bundle/scripts/game.js` pattern was envisioned but not automated
- Runtime script sandbox expects JS string with `exports.functionName = function(ctx) {...}` pattern

**Research Findings**:
- `compileBundle()` returns `BundleCompileResult` with `gameDefinition`, `rawData`, `processedFiles`
- RawBundleData needs new `scripts` field
- GameDefinition.script is already a string field - supports output format
- RunScriptAction calls exports by name: `{ type: "run_script", export: "onPickup" }`

### Metis Review
**Identified Gaps** (addressed):
- Sync vs Async: Keep synchronous API, VirtualFileReader is sync-compatible
- Script compilation: JavaScript only for v1, TypeScript support via external precompile
- Error context: Virtual files use `virtual://path` prefix for stack traces
- Asset resolution: Dual-mode (local + remote) enables offline bundles while maintaining CDN fallback

**Design Decisions (User Clarifications)**:
- **Breaking changes OK**: Games will be rebundled/republished, no need for backwards compat
- **Runtime unchanged**: File-based scripts are compile-time only, runtime just sees `gameDefinition.script`
- **Two-pass validation**: Structural (Zod schemas) + Semantic (cross-references)
- **No eval/new Function**: All script execution via ScriptSandbox only
- Asset manifest supports both `remoteUrl` (CDN) and `localPath` (bundled)
- Enables future workflow: zip entire `.bundle/` directory → upload to CDN → distribute offline-capable games

### Existing Code References (CRITICAL for Implementation)

**Path Handling Patterns (for Task 1 - FileReader):**
```typescript
// From shared/src/bundle/compiler.ts:33-46
// Current directory scanning - uses path.join with absolute paths
function scanForJsonFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);  // ← Always absolute
    if (entry.isDirectory()) {
      scanForJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);  // ← Absolute paths collected
    }
  }
  return files;
}

// From shared/src/bundle/compiler.ts:379-400
// Current existence check pattern
if (!fs.existsSync(bundlePath)) {
  errors.push({ code: 'MISSING_FILE', message: `Bundle directory does not exist: ${bundlePath}` });
}
const bundleStat = fs.statSync(bundlePath);
if (!bundleStat.isDirectory()) {
  errors.push({ code: 'INVALID_BUNDLE_STRUCTURE', message: `Bundle path is not a directory: ${bundlePath}` });
}
```
**Key Insight**: All paths are absolute. FileReader.existsSync() receives absolute paths.

**Error Handling Patterns (for Tasks 4, 7):**
```typescript
// From shared/src/bundle/compiler.ts:48-75
// Error handling pattern - return object with error, don't throw
function readJsonFile(filePath: string): { data: unknown; error?: CompileError } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return { data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        data: null,
        error: {
          code: 'INVALID_JSON',
          message: `Invalid JSON in file: ${filePath}`,
          file: filePath,
          context: { parseError: (error as Error).message },
        },
      };
    }
    return {
      data: null,
      error: {
        code: 'MISSING_FILE',
        message: `Failed to read file: ${filePath}`,
        file: filePath,
        context: { error: (error as Error).message },
      },
    };
  }
}
```
**Key Insight**: Errors include `code`, `message`, `file`, `context`. Never throw - return error objects.

**Asset Processing Pattern (for Task 7):**
```typescript
// From shared/src/bundle/compiler.ts:341-355
// Current asset processing in buildGameDefinition - outputs imageUrl
assetPacks: assets ? {
  default: {
    id: 'default',
    name: 'Default Assets',
    assets: Object.fromEntries(
      Object.entries(assets).map(([id, asset]) => [
        id,
        {
          imageUrl: asset.path,  // ← Currently just uses path as imageUrl
          type: asset.type as 'image' | 'sound',
        },
      ])
    ),
  },
} : undefined,
```
**Key Insight**: Change `imageUrl: asset.path` to `imageUrl: asset.remoteUrl || asset.path, localPath: asset.localPath`.

**Asset Reference Validation Pattern (for Task 7):**
```typescript
// From shared/src/bundle/compiler.ts:203-234
// Current pattern for validating asset references in templates/entities
function validateAssetRefs(
  items: Array<Record<string, unknown>>,
  assets: Set<string>,
  category: 'templates' | 'entities',
  errors: CompileError[]
): void {
  function checkObject(obj: unknown, currentPath: string[]): void {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;
    const record = obj as Record<string, unknown>;
    if ('asset' in record && typeof record.asset === 'string') {
      const assetId = record.asset;
      if (!assets.has(assetId)) {
        errors.push({
          code: 'UNKNOWN_ASSET',
          message: `Unknown asset reference: "${assetId}"`,
          path: [...currentPath, 'asset'].join('.'),
        });
      }
    }
    for (const [key, value] of Object.entries(record)) {
      checkObject(value, [...currentPath, key]);
    }
  }
  for (const item of items) {
    const itemId = (item.id as string) || 'unknown';
    checkObject(item, [category, itemId]);
  }
}
```

**Game Loading Pattern (for Task 5):**
```typescript
// From app/lib/registry/generated/testGames.ts (AUTO-GENERATED)
// Current pattern: Dynamic imports from TypeScript game.ts files
const loaders: Record<TestGameId, () => Promise<{ default: GameDefinition }>> = {
  "ballSortScripted": () => import("@/lib/test-games/games/ballSortScripted/game"),
  "breakoutBouncer": () => import("@/lib/test-games/games/breakoutBouncer/game"),
  // ...
};

export async function loadTestGame(id: TestGameId): Promise<GameDefinition> {
  const loader = loaders[id];
  const module = await loader();
  return module.default;
}
```
**Key Insight**: Registry is auto-generated by `scripts/generate-registry.mjs`. For Task 5:
- Option A: Update registry generator to detect bundle-only games and generate different loaders
- Option B: Add a separate `loadBundleGame()` function that calls `compileBundle()`
- **Recommended**: Option B (simpler, doesn't change generator logic)

### Script Strategy: Compile-Time Only (Runtime Unchanged)

**Key Insight**: File-based scripts are a **compile-time authoring improvement**. The runtime doesn't change.

**Flow:**
```
COMPILE TIME                           RUNTIME
─────────────                          ───────
scripts/game.js    ─┐
scripts/helpers.js ─┼─► concatenate ─► gameDefinition.script ─► ScriptSandbox
scripts/utils.js   ─┘                  (single string)          (unchanged)
```

**What the bundler does:**
1. Read all `scripts/*.js` files
2. Concatenate them (alphabetically, with separators)
3. Put result in `gameDefinition.script` field
4. Hand complete `GameDefinition` to runtime

**What the runtime sees:**
- Just `gameDefinition.script` - a single string (same as always)
- Runtime has NO knowledge of file-based vs embedded origin
- ScriptSandbox loads the string, rules call exports - nothing changes

**Migration Plan for Existing Games:**

| Game | Has Embedded Script? | Migration Action |
|------|---------------------|------------------|
| ballSortScripted | YES (BALL_SORT_SCRIPT) | Convert in-place to pure bundle (Task 5) |
| breakoutScripted | YES (inline) | OUT OF SCOPE - manual migration later |
| ballSort | NO | No action needed |
| breakoutBouncer | NO | No action needed |
| flappyBird | NO | No action needed |
| gemCrush | NO | No action needed |
| slopeggle | NO | No action needed |

**Scope Decision**: 
- Task 5 converts ballSortScripted in-place to pure bundle format (no TypeScript)
- This provides a real working example of the new bundle-based script loading
- `ballSort` (non-scripted) remains unchanged - tests the TypeScript import path
- Other scripted games (breakoutScripted) migrate manually later
- **This plan does NOT migrate all games** - just provides the infrastructure

### Two-Pass Validation Strategy

**Pass 1: Structural Validation ("Can you even bundle it?")**
- Uses Zod schemas for strict type checking
- Validates:
  - JSON files are valid JSON
  - Required fields present (manifest.name, etc.)
  - Type correctness (numbers are numbers, arrays are arrays)
  - Script files are valid UTF-8 with `exports.` pattern
  - Asset references are well-formed
- Result: `CompileError[]` - bundle fails if any errors

**Pass 2: Semantic Validation ("Does it make sense as a game?")**
- Cross-reference validation:
  - Entity templates exist when referenced
  - Asset IDs exist when used in visuals
  - Script exports exist when called by rules
  - Constant references resolve
- Game logic validation:
  - Win/lose conditions reference valid variables
  - Rules have valid trigger types
  - State machine transitions reference valid states
- Result: `CompileWarning[]` - bundle succeeds but may not work at runtime

**Implementation**: Both passes run in `compileBundle()`, errors/warnings returned in `BundleCompileResult`

---

## Architecture: Bundling vs Runtime (Completely Separate)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUNDLING / LOADING (Compile-Time)                     │
│                                                                              │
│   SOURCE A: TypeScript          SOURCE B: Pre-Bundled Dir    SOURCE C: AI   │
│   (game.ts, script.ts)          (JSON + JS files)            (Virtual FS)   │
│         │                              │                          │         │
│         ▼                              ▼                          ▼         │
│   [TS Bundler]                 [Directory Loader]        [Virtual Loader]   │
│   (build-game-bundles.mjs)     (compileBundle)           (compileBundle     │
│         │                              │                  + VirtualReader)  │
│         └──────────────────────────────┼──────────────────────────┘         │
│                                        │                                    │
│                                        ▼                                    │
│                              ┌─────────────────┐                            │
│                              │ GameDefinition  │  ← Same output regardless  │
│                              │ (JSON object)   │    of source               │
│                              └────────┬────────┘                            │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼─────────────────────────────────────┐
│                              RUNTIME (Completely Separate)                   │
│                                        │                                    │
│                                        ▼                                    │
│                              ┌─────────────────┐                            │
│                              │  Game Engine    │  ← Doesn't know/care       │
│                              │  (ScriptSandbox │    where GameDefinition    │
│                              │   + Physics)    │    came from               │
│                              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Insight**: Runtime receives `GameDefinition` - it has NO knowledge of:
- Whether source was TypeScript or pre-bundled
- Whether files were real or virtual
- Whether scripts were in separate files or embedded

**This refactor only changes BUNDLING. Runtime is unchanged.**

---

## Usage Examples

### Example A: AI-Generated Game (Virtual FS)
```typescript
const gameFiles = new Map([
  ['manifest.json', JSON.stringify({ name: 'ai-game', title: 'AI Game' })],
  ['templates/player.json', JSON.stringify([{ id: 'player' }])],
  ['scripts/game.js', 'exports.onStart = function(ctx) { ... }'],
]);
const fileReader = new VirtualFileReader(gameFiles, '/virtual/bundle');
const result = compileBundle('/virtual/bundle', { fileReader });
// result.gameDefinition ready for runtime
```

### Example B: Pre-Bundled Directory (Real FS)
```typescript
// Directory: app/lib/test-games/games/myGame/.bundle/
//   ├── manifest.json
//   ├── templates/player.json
//   └── scripts/game.js
const result = compileBundle('app/lib/test-games/games/myGame/.bundle');
// result.gameDefinition ready for runtime (same format as Example A)
```

### Example C: TypeScript Source (Build Step)
```typescript
// Source: app/lib/test-games/games/myGame/game.ts
// Build: pnpm build:games
// Output: app/lib/test-games/games/myGame/.bundle/ (same as Example B)
// Then load with compileBundle() as in Example B
```

**All three produce identical `GameDefinition` structure.**

---

## Work Objectives

### Core Objective
Create a FileReader abstraction that allows the bundle compiler to work with both real files and virtual (in-memory) files, enabling AI-generated games to flow through the same compilation pipeline as locally developed games.

### Concrete Deliverables
- `shared/src/bundle/FileReader.ts` - Interface + NodeFileReader + VirtualFileReader implementations
- `shared/src/bundle/compiler.ts` - Refactored to use FileReader, supports `.js` files
- `shared/src/bundle/types.ts` - Updated RawBundleData with `scripts` field
- `app/scripts/build-game-bundles.mjs` - Updated to compile script.ts → scripts/game.js
- `shared/src/bundle/__tests__/` - Comprehensive tests for virtual bundle compilation

### Definition of Done
- [ ] `cd shared && pnpm test` → All tests pass
- [ ] Existing games with embedded scripts continue to work (backwards compatible)
- [ ] New game with separate `script.js` file compiles and runs
- [ ] VirtualFileReader creates bundle identical to real files

### Must Have
- FileReader interface with `readFile`, `exists`, `readdir` methods
- NodeFileReader that wraps existing fs calls
- VirtualFileReader for in-memory file maps
- Script file scanning (`.js` files in bundle)
- Concatenated script output to GameDefinition.script
- **Zod schemas** for structural validation (Pass 1)
- **Cross-reference validation** for semantic validation (Pass 2)
- Asset manifest supporting dual-mode references (remote URL OR local path)
- `assets/` directory support in bundle for local asset files
- Asset resolution that prefers local files when present, falls back to remote URLs

### Must NOT Have (Guardrails)
- **No embedded scripts** - File-based only (breaking change OK, games will be rebundled)
- **No TypeScript scripts** - JavaScript only for v1 (precompile externally if needed)
- **No script dependencies/imports** - Single-file scripts only, use concatenation
- **No eval() or new Function()** - Scripts are read only, execution via ScriptSandbox
- **No remote bundle loading** - Local/virtual FS only (asset URLs are references, not bundle fetching)
- **No script minification/bundling** - Raw file concatenation only
- **No generator scripts** - Different problem, out of scope
- **No automatic asset downloading** - Asset download is a separate CLI/tool concern, not compiler

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **User wants tests**: YES (TDD for core interfaces)
- **Framework**: vitest (run via `cd shared && pnpm test`)

### If TDD Enabled

Each task follows RED-GREEN-REFACTOR:

**Task Structure:**
1. **RED**: Write failing test first
   - Test file: `shared/src/bundle/__tests__/*.test.ts`
   - Test command: `cd shared && pnpm test`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `cd shared && pnpm test`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `cd shared && pnpm test`
   - Expected: PASS (still)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: FileReader interface + implementations
├── Task 3: Update RawBundleData types (includes asset types)
└── Task 6: Update build script for script.ts compilation

Wave 2 (After Wave 1):
├── Task 2: Refactor compiler to use FileReader (depends: 1)
├── Task 4: Add script file scanning (depends: 2, 3)
├── Task 5: Convert ballSortScripted to pure bundle (depends: 2)
└── Task 7: Add asset resolution to compiler (depends: 2, 3)

Wave 3 (After Wave 2):
└── Task 8: Integration tests with virtual bundles (depends: 2, 4, 5, 7)

Critical Path: Task 1 → Task 2 → Task 4 → Task 8
Parallel Speedup: ~40% faster than sequential
```

**Note on Task 5**: Depends on Task 2 (compileBundle with FileReader) because we need the bundle loader working to test the converted game. Does NOT depend on Task 6 (script.ts compilation) because ballSortScripted will be a pure bundle with hand-written .js, not compiled TypeScript.

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | 3, 6 |
| 2 | 1 | 4, 5, 7, 8 | - |
| 3 | None | 4, 7 | 1, 6 |
| 4 | 2, 3 | 8 | 5, 7 |
| 5 | 2 | 8 | 4, 6, 7 |
| 6 | None | - | 1, 3, 5 |
| 7 | 2, 3 | 8 | 4, 5 |
| 8 | 2, 4, 5, 7 | None | None (final) |

**Note**: Task 5 (convert ballSortScripted) depends on Task 2 (compileBundle with FileReader), NOT Task 6. Task 6 (script.ts compilation) is for TypeScript-sourced games, while Task 5 creates a pure bundle game.

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 3, 6 | 3x delegate_task(category="quick") |
| 2 | 2, 4, 5, 7 | delegate_task(category="unspecified-high") for 2,4,7; quick for 5 |
| 3 | 8 | delegate_task(category="unspecified-high") |

---

## TODOs

### Task 1: Create FileReader Interface and Implementations

- [x] 1. FileReader Interface + NodeFileReader + VirtualFileReader

  **What to do**:
  - Create `shared/src/bundle/FileReader.ts` with:
    - `FileReader` interface defining the methods below
    - `NodeFileReader` class implementing interface using Node.js `fs` module
    - `VirtualFileReader` class implementing interface using in-memory Map
  - Both implementations MUST be synchronous (matching existing compiler pattern)
  - VirtualFileReader constructor accepts `Map<string, string>` for initial files AND a `bundleRoot` path

  **REQUIRED: Complete FileReader Interface Definition:**
  ```typescript
  import type { Dirent as FsDirent } from 'fs';
  
  // Use Node's Dirent type (re-export for convenience)
  export type Dirent = FsDirent;
  
  // Minimal stat result (only what compiler needs)
  export interface StatResult {
    isFile(): boolean;
    isDirectory(): boolean;
  }
  
  export interface FileReader {
    /** Reads file contents as UTF-8 string. Throws Error on failure. */
    readFileSync(filePath: string): string;
    
    /** Checks if path exists. Returns false on ANY error (never throws). */
    existsSync(filePath: string): boolean;
    
    /** Lists directory contents. Throws Error on failure. */
    readdirSync(dir: string): Dirent[];
    
    /** Gets file/directory stats. Throws Error on failure. */
    statSync(path: string): StatResult;
  }
  ```

  **REQUIRED: Error Handling Contract:**
  
  | Method | NodeFileReader Behavior | VirtualFileReader Behavior |
  |--------|------------------------|---------------------------|
  | `readFileSync()` | Propagates Node fs errors (ENOENT, EACCES) | Throws `Error("ENOENT: no such file: {path}")` |
  | `existsSync()` | Returns `false` on ANY error (never throws) | Returns `false` if outside bundleRoot OR not in Map |
  | `readdirSync()` | Propagates Node fs errors | Throws `Error("ENOENT: ...")` if outside bundleRoot |
  | `statSync()` | Propagates Node fs errors | Throws `Error("ENOENT: ...")` if not in Map |
  
  **Rationale**: Match Node fs behavior for consistency. `existsSync` never throws to match Node's pattern.

  **Error Propagation Strategy (How Compiler Handles FileReader Errors):**
  
  | FileReader Method | Throws | Compiler Action |
  |-------------------|--------|-----------------|
  | `readFileSync()` | YES (ENOENT, etc.) | Catch → Convert to `CompileError` with code `MISSING_FILE` |
  | `readdirSync()` | YES (ENOENT, etc.) | Catch → Convert to `CompileError` with code `INVALID_BUNDLE_STRUCTURE` |
  | `statSync()` | YES (ENOENT, etc.) | Catch → Convert to `CompileError` with code `MISSING_FILE` |
  | `existsSync()` | NO (returns false) | No catch needed - check return value |

  **Implementation Pattern for Compiler:**
  ```typescript
  // Compiler should NEVER throw - always return BundleCompileResult with errors array
  function readJsonFile(filePath: string, fileReader: FileReader): { data: unknown; error?: CompileError } | null {
    try {
      const content = fileReader.readFileSync(filePath);  // May throw
      const data = JSON.parse(content);
      return { data };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'MISSING_FILE',
          message: `Failed to read file: ${filePath}`,
          file: filePath,
          context: { error: (error as Error).message },
        },
      };
    }
  }
  ```

  **Path Resolution Strategy:**
  - **NodeFileReader**: Uses absolute paths (existing behavior, delegates to `fs` module)
  - **VirtualFileReader**:
    - Map keys are RELATIVE to bundle root (e.g., `"manifest.json"`, `"templates/player.json"`)
    - `readFileSync(absolutePath)` strips bundleRoot prefix, looks up relative key in Map
    - `existsSync(absolutePath)` checks if Map has key matching relative path
    - `readdirSync(absoluteDir)` simulates directory structure from Map keys (see implementation example below)
    - `statSync(absolutePath)` returns mock stat with `isFile()` and `isDirectory()`

  **CRITICAL CLARIFICATION - VirtualFileReader Map Structure:**
  ```typescript
  // CORRECT USAGE - Map keys are RELATIVE to bundleRoot:
  const files = new Map([
    ['manifest.json', '{"name": "test-game"}'],           // ✓ Relative key
    ['templates/player.json', '[{"id": "player"}]'],      // ✓ Relative key
    ['scripts/game.js', 'exports.onStart = function() {}'], // ✓ Relative key
  ]);
  const reader = new VirtualFileReader(files, '/virtual/bundle');
  
  // When compiler calls with ABSOLUTE path:
  reader.readFileSync('/virtual/bundle/manifest.json')
  // VirtualFileReader does:
  //   1. Strips bundleRoot prefix: '/virtual/bundle/manifest.json' → 'manifest.json'
  //   2. Looks up 'manifest.json' in Map
  //   3. Returns '{"name": "test-game"}'
  
  // WRONG USAGE - Don't use absolute keys:
  const wrongFiles = new Map([
    ['/virtual/bundle/manifest.json', '...'],  // ✗ Absolute key - WRONG
  ]);
  ```

  **VirtualFileReader Implementation Examples:**
  
  **statSync() implementation:**
  ```typescript
  statSync(absolutePath: string): StatResult {
    const relative = this.toRelative(absolutePath);
    const isFile = this.files.has(relative);
    const isDir = [...this.files.keys()].some(k => k.startsWith(relative + '/'));
    
    if (!isFile && !isDir) {
      throw new Error(`ENOENT: no such file or directory: ${absolutePath}`);
    }
    
    return {
      isFile: () => isFile,
      isDirectory: () => isDir,
    };
  }
  ```

  **VirtualFileReader Directory Simulation:**
  ```typescript
  class VirtualFileReader implements FileReader {
    private normalizedRoot: string;
    
    constructor(private files: Map<string, string>, bundleRoot: string) {
      // Normalize: remove trailing slash, use forward slashes
      this.normalizedRoot = bundleRoot.replace(/\\/g, '/').replace(/\/$/, '');
    }
    
    private toRelative(absolutePath: string): string {
      const normalized = absolutePath.replace(/\\/g, '/');
      
      // Path must start with bundleRoot
      if (!normalized.startsWith(this.normalizedRoot)) {
        throw new Error(`Path outside bundle root: ${absolutePath}`);
      }
      
      // Strip bundleRoot prefix, handle both "/bundle/file" and "/bundle" cases
      let relative = normalized.slice(this.normalizedRoot.length);
      if (relative.startsWith('/')) relative = relative.slice(1);
      return relative;
    }
    
    readFileSync(filePath: string): string {
      const relative = this.toRelative(filePath);
      const content = this.files.get(relative);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file: ${filePath}`);
      }
      return content;
    }
    
    existsSync(filePath: string): boolean {
      try {
        const relative = this.toRelative(filePath);
        return this.files.has(relative) || 
          [...this.files.keys()].some(k => k.startsWith(relative + '/'));
      } catch {
        return false; // Path outside bundle root = doesn't exist
      }
    }
    
    readdirSync(dir: string): Dirent[] {
      const relativeDir = this.toRelative(dir);
      const prefix = relativeDir === '' ? '' : relativeDir + '/';
      
      const entries = new Set<string>();
      for (const key of this.files.keys()) {
        if (key.startsWith(prefix)) {
          const remainder = key.slice(prefix.length);
          const nextSlash = remainder.indexOf('/');
          const entry = nextSlash === -1 ? remainder : remainder.slice(0, nextSlash);
          if (entry) entries.add(entry);
        }
      }
      
      return Array.from(entries).map(name => {
        const fullPath = prefix + name;
        const isDir = [...this.files.keys()].some(k => k.startsWith(fullPath + '/'));
        return {
          name,
          isFile: () => this.files.has(fullPath),
          isDirectory: () => isDir,
        } as Dirent;
      });
    }
  }
  ```

  **Path Resolution Edge Cases:**
  | Case | Behavior |
  |------|----------|
  | Path outside bundleRoot | `readFileSync` throws error, `existsSync` returns false |
  | Trailing slash on bundleRoot | Normalized away in constructor |
  | Windows backslashes | Converted to forward slashes |
  | Empty relative path (bundleRoot itself) | Returns `''`, which is valid for `readdirSync` |
  | Relative bundleRoot (`./bundle`) | **ERROR** - bundleRoot must be absolute path |
  | Symlinks in bundleRoot | **NOT resolved** - use path as-is (matches Node fs behavior) |
  | `..` in absolute path | **NOT normalized** - use path as-is (caller should normalize if needed) |
  | Case sensitivity (`Assets/` vs `assets/`) | **Case-sensitive** - Map keys must match exactly |
  | Trailing slash on file path | Stripped before lookup (`/bundle/file/` → `file`) |
  
  **Constructor Validation (EXACT BEHAVIOR):**
  ```typescript
  constructor(files: Map<string, string>, bundleRoot: string) {
    // VALIDATION 1: bundleRoot must be absolute
    if (!path.isAbsolute(bundleRoot)) {
      throw new Error(`VirtualFileReader: bundleRoot must be absolute path, got: ${bundleRoot}`);
    }
    
    // VALIDATION 2: Normalize path separators and trailing slashes
    this.normalizedRoot = bundleRoot.replace(/\\/g, '/').replace(/\/$/, '');
    this.files = files;
    
    // NO validation of Map keys - any relative paths are allowed
    // Validation happens at method call time (readFileSync, etc.)
  }
  ```

  **Edge Case Handling Summary:**
  | Input | Constructor Behavior | Method Behavior |
  |-------|---------------------|-----------------|
  | Relative bundleRoot (`./bundle`) | **THROW immediately** | N/A (constructor failed) |
  | Absolute bundleRoot (`/virtual/bundle`) | Accept | Normal operation |
  | Map key with absolute path | Accept (no validation) | `toRelative()` throws "outside bundle root" |
  | Map key with relative path | Accept | Normal operation |
  | Empty bundleRoot (`""`) | **THROW immediately** (not absolute) | N/A |

  **Rationale**: Fail fast on invalid bundleRoot (constructor), fail gracefully on invalid paths (methods return errors).

  **Must NOT do**:
  - Do NOT add async methods - compiler is synchronous
  - Do NOT add file watching - out of scope
  - Do NOT add write methods - read-only interface

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with well-defined interface
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of bundle system context

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 6)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `shared/src/bundle/compiler.ts:33-75` - Current fs.readFileSync and fs.readdirSync usage patterns to replace
  - `shared/src/bundle/types.ts` - Type patterns used in bundle system

  **Acceptance Criteria**:
  - [ ] Test file created: `shared/src/bundle/__tests__/FileReader.test.ts`
  - [ ] Test covers: NodeFileReader reads real file, VirtualFileReader reads from map
  - [ ] Test covers: Both implementations have identical interface
  - [ ] `cd shared && pnpm test/__tests__/FileReader.test.ts` → PASS

  **Commit**: YES
  - Message: `feat(bundle): add FileReader interface with Node and Virtual implementations`
  - Files: `shared/src/bundle/FileReader.ts`, `shared/src/bundle/__tests__/FileReader.test.ts`
  - Pre-commit: `cd shared && pnpm test`

---

### Task 2: Refactor Bundle Compiler to Use FileReader

- [x] 2. Refactor compiler.ts to accept FileReader dependency

  **What to do**:
  - Modify `compileBundle(bundlePath: string, options?: { fileReader?: FileReader })` signature
  - Default `fileReader` to `new NodeFileReader()` for backwards compatibility
  - Replace all direct `fs.*` calls with `fileReader.*` equivalents
  - Update helper function signatures to accept fileReader parameter

  **FileReader Refactoring Pattern:**
  ```typescript
  // Before (helper functions)
  function scanForJsonFiles(dir: string, files: string[] = []): string[]
  function readJsonFile(filePath: string): { data: unknown; error?: CompileError } | null

  // After (helper functions receive fileReader)
  function scanForJsonFiles(dir: string, fileReader: FileReader, files: string[] = []): string[]
  function readJsonFile(filePath: string, fileReader: FileReader): { data: unknown; error?: CompileError } | null
  ```

  **compileBundle Signature:**
  ```typescript
  export function compileBundle(
    bundlePath: string, 
    options?: { fileReader?: FileReader }
  ): BundleCompileResult {
    const fileReader = options?.fileReader ?? new NodeFileReader();
    
    // Pass fileReader to all helper functions
    const jsonFiles = scanForJsonFiles(bundlePath, fileReader);
    const result = readJsonFile(filePath, fileReader);
    // ... etc
  }
  ```

  **Replacement Mapping:**
  | Before | After |
  |--------|-------|
  | `fs.readFileSync(path, 'utf-8')` | `fileReader.readFileSync(path)` |
  | `fs.readdirSync(dir, { withFileTypes: true })` | `fileReader.readdirSync(dir)` |
  | `fs.existsSync(path)` | `fileReader.existsSync(path)` |
  | `fs.statSync(path)` | `fileReader.statSync(path)` |

  **Must NOT do**:
  - Do NOT change the return type of compileBundle
  - Do NOT change existing test behavior when no fileReader is passed
  - Do NOT add new functionality yet - pure refactor

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Significant refactoring requiring careful attention to all fs call sites
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of bundle compiler structure

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 1)
  - **Blocks**: Tasks 4, 7
  - **Blocked By**: Task 1

  **References**:
  - `shared/src/bundle/compiler.ts` - Full file, all fs.* calls need replacement
  - `shared/src/bundle/FileReader.ts` - Interface to use (created in Task 1)
  - `shared/src/bundle/loader.ts` - Uses fs.existsSync, needs update

  **loader.ts Changes (REQUIRED):**

  **Current code** (`shared/src/bundle/loader.ts`):
  ```typescript
  // Line 1-5: Direct fs import
  import * as fs from 'node:fs';
  
  // Line 37-43: isBundleDirectory uses fs
  export function isBundleDirectory(dirPath: string): boolean {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false;
    }
    const bundlePath = path.join(dirPath, BUNDLE_SUBDIR);
    return fs.existsSync(bundlePath) && fs.statSync(bundlePath).isDirectory();
  }
  
  // Line 71-72: loadBundleSync calls compileBundle
  export function loadBundleSync(bundlePath: string): LoadBundleResult | null {
    const result = compileBundle(bundlePath);
  ```

  **After Task 2** (add fileReader parameter):
  ```typescript
  // Add import
  import { FileReader, NodeFileReader } from './FileReader';
  
  // Update isBundleDirectory to accept optional fileReader
  export function isBundleDirectory(
    dirPath: string, 
    fileReader: FileReader = new NodeFileReader()
  ): boolean {
    if (!fileReader.existsSync(dirPath)) return false;
    try {
      const stat = fileReader.statSync(dirPath);
      if (!stat.isDirectory()) return false;
    } catch { return false; }
    
    const bundlePath = path.join(dirPath, BUNDLE_SUBDIR);
    return fileReader.existsSync(bundlePath);
  }
  
  // Update loadBundleSync to accept optional fileReader
  export function loadBundleSync(
    bundlePath: string,
    options?: { fileReader?: FileReader }
  ): LoadBundleResult | null {
    const result = compileBundle(bundlePath, options);
    // ... rest unchanged
  }
  ```

  **Backwards compatibility**: Existing callers work unchanged (no options = NodeFileReader).

  **Acceptance Criteria**:
  - [ ] Test file: `shared/src/bundle/__tests__/compiler.test.ts`
  - [ ] Test covers: compileBundle without options works identically (backwards compat)
  - [ ] Test covers: compileBundle with VirtualFileReader produces same result as real files
  - [ ] Grep for `fs.` in compiler.ts returns ZERO matches (except imports)
  - [ ] `cd shared && pnpm test` → PASS

  **Commit**: YES
  - Message: `refactor(bundle): use FileReader abstraction in compiler`
  - Files: `shared/src/bundle/compiler.ts`, `shared/src/bundle/loader.ts`, `shared/src/bundle/__tests__/compiler.test.ts`
  - Pre-commit: `cd shared && pnpm test`

---

### Task 3: Update RawBundleData Types for Scripts and Assets

- [x] 3. Add scripts and asset resolution types to RawBundleData

  **What to do**:
  - Add `scripts: Record<string, string> | null` to `RawBundleData` interface
  - Scripts keyed by filename without extension (e.g., `{ "game": "exports.onStart = ..." }`)
  - Add `AssetReference` type supporting dual-mode:
    ```typescript
    interface AssetReference {
      id: string;
      type: 'image' | 'sound';
      // Remote URL (for CDN-hosted assets)
      remoteUrl?: string;
      // Local path relative to bundle (for offline/downloaded assets)
      localPath?: string;  // e.g., "assets/ball0.png"
    }
    ```
  - Update `RawBundleData.assets` to use new `AssetReference` structure
  - **Update `AssetDefinition` in `shared/src/types/GameDefinition.ts`** to add `localPath` field:
    ```typescript
    // In GameDefinition.ts, find the asset type and add localPath:
    interface AssetDefinition {  // Or whatever the actual type name is
      imageUrl?: string;    // Existing field
      localPath?: string;   // ADD THIS - local path relative to bundle
      type: 'image' | 'sound';
    }
    ```
  - Add `CompileErrorCode` for script errors: `'INVALID_SCRIPT'`, `'SCRIPT_SYNTAX_ERROR'`
  - Add `CompileWarningCode` for duplicate exports: `'DUPLICATE_EXPORT'`
  - Add `CompileErrorCode` for asset errors: `'MISSING_LOCAL_ASSET'`, `'INVALID_ASSET_REFERENCE'`

  **Asset Manifest Format (INPUT vs OUTPUT)**:

  **Current `assets.json` (INPUT - existing format, still supported):**
  ```json
  {
    "ball": {
      "path": "https://cdn.example.com/ball.png",
      "type": "image"
    }
  }
  ```

  **New `assets.json` (INPUT - supports dual-mode, backwards compatible):**
  ```json
  {
    "ball": {
      "type": "image",
      "remoteUrl": "https://cdn.example.com/ball.png",
      "localPath": "assets/ball.png"
    }
  }
  ```

  **Compiler Processing:**
  1. Read `assets.json` → detect format (legacy `path` or new `remoteUrl`/`localPath`)
  2. If legacy format: treat `path` as `remoteUrl` (backwards compat)
  3. Populate `RawBundleData.assets` in normalized format
  4. Existing `buildGameDefinition()` (lines 341-355) populates `GameDefinition.assetPacks`
  5. **Change needed**: Update lines 346-352 to use both `remoteUrl` and `localPath` fields

  **REQUIRED: Asset Format Detection Algorithm:**
  ```typescript
  function detectAssetFormat(entry: unknown): 'legacy' | 'new' | 'error' {
    if (typeof entry !== 'object' || entry === null) return 'error';
    const obj = entry as Record<string, unknown>;
    
    // Has 'path' but NOT 'remoteUrl' or 'localPath' → legacy format
    if ('path' in obj && !('remoteUrl' in obj) && !('localPath' in obj)) {
      return 'legacy';
    }
    
    // Has 'remoteUrl' OR 'localPath' (or both) → new format
    if ('remoteUrl' in obj || 'localPath' in obj) {
      return 'new';
    }
    
    // Has neither 'path' nor 'remoteUrl'/'localPath' → error
    return 'error';
  }
  
  function normalizeAssetEntry(id: string, entry: unknown, errors: CompileError[]): NormalizedAsset | null {
    const format = detectAssetFormat(entry);
    const obj = entry as Record<string, unknown>;
    
    if (format === 'error') {
      errors.push({ code: 'INVALID_ASSET_REFERENCE', message: `Asset "${id}" has no path, remoteUrl, or localPath` });
      return null;
    }
    
    if (format === 'legacy') {
      // Legacy: convert 'path' to 'remoteUrl'
      return { remoteUrl: obj.path as string, type: obj.type as string };
    }
    
    // New format: use remoteUrl/localPath directly
    return {
      remoteUrl: obj.remoteUrl as string | undefined,
      localPath: obj.localPath as string | undefined,
      type: obj.type as string
    };
  }
  ```
  
  **Conflict Resolution:**
  - If BOTH `path` AND `remoteUrl` exist → Use `remoteUrl`, ignore `path` (new format takes precedence)
  - If NEITHER `path` NOR `remoteUrl`/`localPath` exist → Emit `INVALID_ASSET_REFERENCE` error

  **Must NOT do**:
  - Do NOT change GameDefinition.script - it remains a single string
  - Do NOT add script execution - just type definitions
  - Do NOT implement asset downloading - just type definitions

  **Runtime Compatibility Guarantee (CRITICAL):**
  
  This plan adds a NEW field (`localPath`) to the asset types. The runtime currently only uses `imageUrl`.
  
  | Component | Current Behavior | After This Plan |
  |-----------|------------------|-----------------|
  | **Bundler** | Outputs `imageUrl` only | Outputs `imageUrl` AND `localPath` |
  | **Runtime** | Reads `imageUrl` only | **UNCHANGED** - still reads `imageUrl` only |
  
  **Forward Compatibility**:
  - Games bundled with new compiler WILL work with current runtime
  - `localPath` field is stored but ignored until runtime is updated (separate PR)
  - Runtime continues using `imageUrl` (remote CDN URLs)
  - This enables **independent deployment**: bundler can be updated without runtime changes
  
  **Future Runtime Update** (OUT OF SCOPE):
  - Runtime will check `localPath` first, fall back to `imageUrl`
  - Enables offline-capable games
  - Separate PR after this bundler work is complete
  
  **Verification**: After Task 7, compile a test bundle with `localPath` and load it in current runtime → should work (using remote URLs, ignoring localPath).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type-only changes, well-scoped
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of type conventions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6)
  - **Blocks**: Tasks 4, 7
  - **Blocked By**: None

  **References**:
  - `shared/src/bundle/types.ts:88-103` - RawBundleData interface to extend
  - `shared/src/bundle/types.ts:27-37` - CompileErrorCode to extend
  - `shared/src/types/GameDefinition.ts` - AssetPack types for compatibility

  **Acceptance Criteria**:
  - [ ] TypeScript compiles: `cd shared && npx tsc --noEmit`
  - [ ] RawBundleData has `scripts: Record<string, string> | null` field
  - [ ] AssetReference type supports both remoteUrl and localPath
  - [ ] CompileErrorCode includes script and asset-related codes

  **Commit**: YES
  - Message: `feat(bundle): add scripts and asset resolution types`
  - Files: `shared/src/bundle/types.ts`
  - Pre-commit: `cd shared && npx tsc --noEmit`

---

### Task 4: Add Script File Scanning to Compiler

- [ ] 4. Extend compiler to discover and process `.js` script files

  **What to do**:
  - Add `scanForScriptFiles(dir: string, fileReader: FileReader)` function
    - Scans `scripts/` subdirectory for `.js` files
    - Returns array of relative paths sorted alphabetically
  - Add `readScriptFile(filePath: string, fileReader: FileReader)` function
    - Reads script content
    - Basic validation via regex heuristics (NO parsing, NO execution)
    - Returns `{ content: string; error?: CompileError }`
  - Update `compileBundle` to:
    - Call scanForScriptFiles after JSON scanning
    - Populate `rawData.scripts` with script contents (keyed by filename without extension)
    - Concatenate all scripts into `gameDefinition.script` field
    - Add processed script files to `processedFiles` array

  **Script Concatenation Rules (EXACT SPECIFICATION):**
  - Scripts are concatenated in **case-sensitive alphabetical order by basename only** (not full path)
  - Sorting uses JavaScript's default `String.prototype.localeCompare()` with no locale options
  - Subdirectories are ignored (emit warning), so only flat `scripts/*.js` files are sorted
  - **Separator placement: BEFORE each script (including first)**
  - Separator format: `// --- ${basename} ---\n` followed by script content
  - All scripts share the same `exports` object
  - If multiple scripts define the same export, **last one wins** (emit warning)
  - Final output is a single string assigned to `gameDefinition.script`

  **Example Output (Separator BEFORE Each):**
  ```javascript
  // --- Game.js ---
  exports.onInit = function(ctx) { ctx.setVariable("ready", true); }
  
  // --- game.js ---
  exports.onStart = function(ctx) { console.log("started"); }
  
  // --- helpers.js ---
  exports.calculateScore = function(points) { return points * 10; }
  ```
  
  **Note**: Every script block starts with its header comment. This aids debugging (stack traces show which file caused an error).

  **Example Sort Order:**
  ```
  scripts/Game.js       → First  (capital G comes before lowercase in ASCII)
  scripts/game.js       → Second
  scripts/helpers.js    → Third
  scripts/z_utils.js    → Fourth
  ```

  **Implementation:**
  ```typescript
  const scriptFiles = scanForScriptFiles(bundlePath, fileReader);
  const sortedFiles = scriptFiles.sort((a, b) => {
    const aBase = path.basename(a);
    const bBase = path.basename(b);
    return aBase.localeCompare(bBase);  // Default locale, case-sensitive
  });
  ```
  
  **Why case-sensitive?**: Matches filesystem behavior on Linux/macOS. Windows users see same order via explicit sort.

  **Script Validation Strategy (Pass 1 - Structural, Regex Only):**
  
  **IMPORTANT**: We do **NOT** parse JavaScript at compile-time. We use regex patterns only.
  - **No parser libraries** (no acorn, esprima, babel) at compile-time
  - **No `new Function()` or `eval()` at COMPILE-TIME** - compile-time is read-only
  - **Runtime uses `new Function()` in ScriptSandbox** - this is UNCHANGED
  - **Syntax errors are caught at RUNTIME** by ScriptSandbox, not compile time
  
  **CLARIFICATION**: The prohibition on `new Function()` applies ONLY to compile-time validation.
  The runtime ScriptSandbox (`app/lib/scripting/ScriptSandbox.ts:102`) already uses `new Function()` 
  to execute scripts - that behavior is unchanged by this plan.
  
  **Compile-time checks (regex-based, quick heuristics):**
  1. File is valid UTF-8 (Zod `z.string()`)
  2. Contains at least one `exports.` assignment (regex: `/exports\.\w+\s*=/`)
  3. Basic brace balance check (see below)
  
  **Brace Balance Check (Heuristic with Known Limitations):**
  ```typescript
  function checkBraceBalance(code: string): boolean {
    // Naive count - ignores braces in strings/comments
    // May produce false positives, that's acceptable
    const open = (code.match(/{/g) || []).length;
    const close = (code.match(/}/g) || []).length;
    return open === close;
  }
  ```
  
  **Known Limitations (Acceptable):**
  - Counts braces inside strings: `const x = "{"` → false positive
  - Counts braces in comments: `// {` → false positive
  - Does NOT validate actual JavaScript syntax
  
  **Why Accept Limitations?**
  - Goal is catching obvious issues (truncated files), not full validation
  - Real syntax errors caught at runtime by ScriptSandbox
  - Avoids adding parser dependency (acorn, babel, etc.)
  - If brace check triggers false positive, developer can inspect manually
  
  **Why no full parsing?**
  - Adding a JS parser is heavyweight dependency
  - ScriptSandbox already handles syntax errors gracefully at runtime
  - Compile-time just needs to catch obvious issues (empty file, no exports)
  
  **If HARD FAIL validation fails:**
  - Add CompileError with code `SCRIPT_SYNTAX_ERROR` or `INVALID_SCRIPT`
  - Message includes which check failed
  - **SKIP that script file** (do not include in concatenation)
  - If ALL scripts fail validation, `gameDefinition.script` is empty string
  
  **IMPORTANT**: Only HARD FAIL checks cause file skipping. SOFT FAIL (brace balance) 
  emits a warning but the file is still included. See table below for exact behavior.
  
  **If scripts directory doesn't exist or is empty:** 
  - `gameDefinition.script` is empty string (valid, no scripts to load)
  
  **Script Validation Rules Summary (Consolidated Reference):**
  
  | Check | Regex/Method | Pass Condition | Fail Type | Fail Action |
  |-------|--------------|----------------|-----------|-------------|
  | UTF-8 valid | `fileReader.readFileSync()` | No exception thrown | **HARD FAIL** | Skip file, emit `INVALID_SCRIPT` error |
  | Has exports | `/exports\.\w+\s*=/` | At least one match | **HARD FAIL** | Skip file, emit `SCRIPT_SYNTAX_ERROR` error |
  | Brace balance | Count `{` vs `}` | Equal counts | **SOFT FAIL** | Emit warning, **INCLUDE file anyway** |
  | No top-level return | `/^\s*return\s/m` | No match | **HARD FAIL** | Skip file, emit `SCRIPT_SYNTAX_ERROR` error |
  
  **HARD FAIL vs SOFT FAIL Definition:**
  - **HARD FAIL** = File is EXCLUDED from concatenation, error added to `CompileError[]`
  - **SOFT FAIL** = File is INCLUDED in concatenation, warning added to `CompileWarning[]`
  
  **Validation Order (Short-Circuit on HARD FAIL):**
  ```
  For each script file:
  1. UTF-8 valid     → If FAIL: emit INVALID_SCRIPT, SKIP remaining checks, exclude file
  2. Has exports     → If FAIL: emit SCRIPT_SYNTAX_ERROR, SKIP remaining checks, exclude file
  3. No top-return   → If FAIL: emit SCRIPT_SYNTAX_ERROR, SKIP remaining checks, exclude file
  4. Brace balance   → If FAIL: emit WARNING (SOFT FAIL), CONTINUE, include file
  ```
  
  **Example with multiple issues:**
  ```typescript
  // File with BOTH: invalid UTF-8 AND no exports
  // Result: ONLY INVALID_SCRIPT error (short-circuited after step 1)
  
  // File with: has exports, no top-return, brace imbalance
  // Result: passes steps 1-3, gets WARNING for brace imbalance, file INCLUDED
  ```
  
  **Why brace imbalance is SOFT FAIL:**
  - False positives from braces in strings (`"{"`) and comments (`// {`) are common
  - Actual brace imbalance causes runtime syntax error in ScriptSandbox (caught there)
  - Hard fail would block valid scripts that happen to have brace-like strings

  **Script Validation (Pass 2 - Semantic):**
  - Cross-reference exports with rules that call them
  - For each `RunScriptAction.export` in rules:
    - Warning if export not found in any script file
  - This catches typos like `{ export: "onPickp" }` when script has `exports.onPickup`

  **Export Conflict Detection Algorithm:**
  
  ```typescript
  // Tracking data structure
  interface ExportTracker {
    // Map: exportName → first file that defined it
    firstDefinition: Map<string, string>;
    // Array of duplicates found
    duplicates: Array<{ name: string; files: [string, string] }>;
  }
  
  function detectExports(scriptContent: string): string[] {
    // Match: exports.functionName = 
    // Match: exports['functionName'] = 
    // Match: exports["functionName"] = 
    const pattern = /exports\.(\w+)\s*=|exports\[['"](\w+)['"]\]\s*=/g;
    const exports: string[] = [];
    let match;
    while ((match = pattern.exec(scriptContent)) !== null) {
      exports.push(match[1] || match[2]);
    }
    return exports;
  }
  ```
  
  **Detection happens DURING concatenation (not after):**
  1. Initialize `ExportTracker` with empty Map and array
  2. For each script file (alphabetical order):
     a. Parse exports using `detectExports(content)`
     b. For each export name:
        - If NOT in `firstDefinition`: add it
        - If already in `firstDefinition`: add to `duplicates` array
  3. After all files processed:
     - Emit CompileWarning for each entry in `duplicates`
     - Message: `Export "${name}" defined in ${file1}, redefined in ${file2}. Last wins.`
  4. Concatenate files in alphabetical order (last definition wins per JS semantics)
  
  **Why during, not after?**: Detection during concatenation avoids re-parsing the combined string and provides accurate file attribution for warnings.

  **Error Handling for Export Detection:**
  - If `detectExports()` regex throws (malformed input): Emit warning, skip export tracking for that file, continue processing
  - If script content is not valid UTF-8: Already caught in `readScriptFile()` validation (INVALID_SCRIPT error)
  - If regex matches incorrectly (false positive): No harm - worst case is unnecessary duplicate warning
  - If no exports detected: Already caught by "has exports" validation check - file is skipped
  
  **Edge Cases:**
  - `exports['weird-name']` with hyphens → NOT matched by `\w+` → no duplicate detection for these
  - `exports[computed]` with variable → NOT matched → no duplicate detection for these
  - Both are rare patterns; acceptable to skip duplicate detection for them

  **Example Concatenation Output:**
  ```javascript
  // --- game.js ---
  exports.onStart = function(ctx) { ctx.setVariable("ready", true); }
  exports.onPickup = function(ctx) { /* ... */ }

  // --- helpers.js ---
  exports.calculateScore = function(points) { return points * 10; }
  ```

  **Rationale**: Alphabetical order ensures deterministic output. Using the same `exports` object matches how the runtime sandbox works (single exports object passed to all code).

  **Must NOT do**:
  - Do NOT execute scripts - read-only
  - Do NOT support nested script directories - flat `scripts/` only
  - Do NOT support TypeScript files - `.js` only

  **Subdirectory Handling (Edge Case):**
  - If `scripts/` contains subdirectories (e.g., `scripts/helpers/`):
    - **Emit CompileWarning** with code `NESTED_SCRIPTS_IGNORED`
    - Message: `Subdirectory "scripts/helpers" ignored. Only flat scripts/*.js files are supported.`
    - **Skip subdirectories** - do not recurse, do not error
  - Rationale: Fail gracefully, don't break compilation for unused directories

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core feature implementation with multiple integration points
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of bundle compiler flow

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 2, 3)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `shared/src/bundle/compiler.ts:33-46` - scanForJsonFiles pattern to follow
  - `shared/src/bundle/compiler.ts:48-75` - readJsonFile pattern to follow
  - `shared/src/bundle/compiler.ts:412-459` - Main processing loop to extend
  - `app/lib/scripting/ScriptSandbox.ts:93-105` - Expected script format for validation

  **Acceptance Criteria**:
  - [ ] Test file: `shared/src/bundle/__tests__/script-scanning.test.ts`
  - [ ] Test covers: Bundle with `scripts/game.js` produces gameDefinition.script
  - [ ] Test covers: Script syntax errors produce CompileError with SCRIPT_SYNTAX_ERROR
  - [ ] Test covers: Empty scripts directory results in null scripts
  - [ ] `cd shared && pnpm test` → PASS

  **Commit**: YES
  - Message: `feat(bundle): add script file scanning and processing`
  - Files: `shared/src/bundle/compiler.ts`, `shared/src/bundle/__tests__/script-scanning.test.ts`
  - Pre-commit: `cd shared && pnpm test`

---

### Task 5: Convert ballSortScripted to Pure Bundle Format

- [ ] 5. Convert ballSortScripted from TypeScript to pure bundle (JSON + .js)

  **What to do**:
  - **Delete** `app/lib/test-games/games/ballSortScripted/game.ts` (the TypeScript source)
  - **Convert** the game to a pure bundle directory structure:
    ```
    ballSortScripted/
    ├── manifest.json          # Game metadata
    ├── templates/             # Entity templates as JSON
    │   └── *.json
    ├── rules.json             # Game rules
    ├── scripts/
    │   └── game.js            # Extracted from BALL_SORT_SCRIPT constant
    └── assets.json            # Asset references
    ```
  - **Extract** the `BALL_SORT_SCRIPT` constant content to `scripts/game.js`
  - **Update game loader** to load this game via `compileBundle()` instead of TypeScript import
  - **Keep `ballSort`** (non-scripted) as comparison - tests the built-in GameDefinition path
  
  **Why this approach**:
  - `ballSort` = tests built-in GameDefinition (TypeScript → import)
  - `ballSortScripted` = tests bundle loading (JSON + .js → compileBundle)
  - Both code paths exercised without duplication
  - Real-world example of pure bundle format

  **Game Loader Update (Based on Actual Architecture)**:
  
  The current system uses a generated registry (`app/lib/registry/generated/testGames.ts`) 
  with dynamic imports. For bundle-only games, we add a separate loading path:
  
  ```typescript
  // NEW FILE: app/lib/test-games/loadBundleGame.ts
  import { compileBundle } from '@slopcade/shared/bundle/compiler';
  import type { GameDefinition } from '@slopcade/shared';
  import * as fs from 'fs';
  import * as path from 'path';
  
  // Bundle games are NOT in the auto-generated registry
  // They're loaded directly via compileBundle
  const BUNDLE_GAMES_PATH = path.join(__dirname, 'games');
  
  export function isBundleOnlyGame(gameId: string): boolean {
    const gamePath = path.join(BUNDLE_GAMES_PATH, gameId);
    const hasManifest = fs.existsSync(path.join(gamePath, 'manifest.json'));
    const hasGameTs = fs.existsSync(path.join(gamePath, 'game.ts'));
    return hasManifest && !hasGameTs;
  }
  
  export function loadBundleGame(gameId: string): GameDefinition {
    const gamePath = path.join(BUNDLE_GAMES_PATH, gameId);
    const result = compileBundle(gamePath);
    if (!result.success) {
      throw new Error(`Failed to compile bundle: ${result.errors[0]?.message}`);
    }
    return result.gameDefinition!;
  }
  ```
  
  **REQUIRED: Integration Point Specification:**
  
  **File to modify**: `app/app/game-detail/[id].tsx`
  
  **All three `loadTestGame` call sites documented:**

  | Line | Function | Context | Error Handling |
  |------|----------|---------|----------------|
  | 69 | `loadGameInfo()` | Loads game metadata for display | Caught → `setError(message)` |
  | 119 | `handleFork()` | Loads game to fork it | Caught → `Alert.alert()` |
  | 152 | `handleEdit()` | Loads game to edit it | NOT caught (should add) |
  
  **Line 69 (inside loadGameInfo function):**
  ```typescript
  // BEFORE (line 67-69):
  if (gameSource === "template" && id && id in TESTGAMES_BY_ID) {
    const entry = TESTGAMES_BY_ID[id as TestGameId];
    const gameDef = await loadTestGame(id as TestGameId);
  
  // AFTER:
  if (gameSource === "template") {
    const isBundleGame = isBundleOnlyGame(id);
    const isRegistryGame = id && id in TESTGAMES_BY_ID;
    
    if (!isBundleGame && !isRegistryGame) {
      throw new Error("Game not found");
    }
    
    const gameDef = isBundleGame 
      ? loadBundleGame(id)
      : await loadTestGame(id as TestGameId);
    
    const entry = isRegistryGame ? TESTGAMES_BY_ID[id as TestGameId] : null;
    setGameInfo({
      id: id,
      title: entry?.meta.title ?? gameDef?.metadata?.title ?? "Untitled",
      // ... rest unchanged
    });
  ```
  
  **Line 119 (inside handleFork function):**
  ```typescript
  // BEFORE (line 118-119):
  if (gameInfo.source === "template") {
    const definition = await loadTestGame(gameInfo.id as TestGameId);
  
  // AFTER:
  if (gameInfo.source === "template") {
    const definition = isBundleOnlyGame(gameInfo.id)
      ? loadBundleGame(gameInfo.id)
      : await loadTestGame(gameInfo.id as TestGameId);
  ```
  
  **Line 152 (inside handleEdit function):**
  ```typescript
  // BEFORE (line 151-152):
  if (gameInfo.source === "template") {
    definition = await loadTestGame(gameInfo.id as TestGameId);
  
  // AFTER:
  if (gameInfo.source === "template") {
    definition = isBundleOnlyGame(gameInfo.id)
      ? loadBundleGame(gameInfo.id)
      : await loadTestGame(gameInfo.id as TestGameId);
  ```
  
  **Error Handling Strategy:**
  - Line 69: Already has try/catch at lines 64-95 → errors show in UI via `setError()`
  - Line 119: Already has try/catch at lines 117-141 → errors show Alert
  - Line 152: **NEEDS try/catch added** to match handleFork pattern
  
  **Registry Consistency and UI Integration (CRITICAL):**
  
  After Task 5, `ballSortScripted` is REMOVED from `TESTGAMES_BY_ID` (intentional).
  - The condition `id in TESTGAMES_BY_ID` will be false for bundle-only games
  - `isBundleOnlyGame()` handles this case
  
  **Bundle Games UI Discovery:**
  
  1. **Define `BUNDLE_GAMES` constant** in `app/lib/test-games/loadBundleGame.ts`:
  ```typescript
  // Manually maintained list of bundle-only games
  // (These don't appear in the auto-generated registry)
  export const BUNDLE_GAMES: ReadonlyArray<{ id: string; meta: { title: string; description?: string } }> = [
    { id: 'ballSortScripted', meta: { title: 'Ball Sort (Scripted)', description: 'Ball sorting with script behaviors' } },
  ];
  ```
  
  2. **Update game list UI** (`app/app/(tabs)/test-games.tsx` or wherever games are listed):
  ```typescript
  // Import both registries
  import { TESTGAMES } from '@/lib/registry/generated/testGames';
  import { BUNDLE_GAMES } from '@/lib/test-games/loadBundleGame';
  
  // Merge for display
  const allGames = [...TESTGAMES, ...BUNDLE_GAMES.map(g => ({ 
    id: g.id, 
    href: `/test-games/${g.id}`, 
    meta: g.meta 
  }))];
  ```
  
  **Manual Verification After Task 5:**
  - [ ] Open the app
  - [ ] Navigate to test games list  
  - [ ] **Verify ballSortScripted is visible** (critical test)
  - [ ] Tap it and verify it loads via bundle path
  - [ ] Play the game and verify scripts work
  
  **Why not modify the registry generator?**
  - Registry generator scans for `export const metadata` in `.ts` files
  - Bundle-only games have no `.ts` files to scan
  - Adding bundle detection to generator adds complexity
  - Simpler: Keep registry for TypeScript games, add separate loader for bundles

  **Must NOT do**:
  - Do NOT keep game.ts alongside bundle - delete it entirely
  - Do NOT modify ballSort (non-scripted) - keep as-is for comparison
  - Do NOT add TypeScript to the bundle - pure JSON + .js only

  **IMPORTANT - Task 5 does NOT depend on Task 6:**
  This task creates `scripts/game.js` by **extracting the existing BALL_SORT_SCRIPT constant** 
  from `game.ts` - it's a copy-paste operation, NOT TypeScript compilation.
  Task 6 (script.ts → scripts/game.js compilation) is for FUTURE TypeScript-authored games.
  Task 5 can proceed as soon as Task 2 (FileReader) is complete.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Conversion + loader update, moderate complexity
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of game structure and loader

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2 (needs compileBundle with FileReader)

  **References**:
  - `app/lib/test-games/games/ballSortScripted/game.ts:162-415` - Script content to extract (BALL_SORT_SCRIPT constant)
  - `app/lib/test-games/games/ballSortScripted/game.ts:608-634` - Rules referencing script exports
  - `app/lib/test-games/games/ballSortScripted/.bundle/` - Existing bundle output (use JSON structure as template)
  - `app/lib/registry/generated/testGames.ts:40-54` - Current loader pattern (for understanding, not modification)
  - `shared/src/bundle/compiler.ts:363` - compileBundle function to use for loading

  **Acceptance Criteria**:
  - [ ] `app/lib/test-games/games/ballSortScripted/game.ts` DELETED
  - [ ] `app/lib/test-games/games/ballSortScripted/manifest.json` EXISTS
  - [ ] `app/lib/test-games/games/ballSortScripted/scripts/game.js` EXISTS with exports
  - [ ] NEW FILE: `app/lib/test-games/loadBundleGame.ts` with `isBundleOnlyGame()` and `loadBundleGame()`
  - [ ] `isBundleOnlyGame('ballSortScripted')` returns `true`
  - [ ] `loadBundleGame('ballSortScripted')` returns valid GameDefinition
  - [ ] Manual verification: ballSortScripted plays correctly via bundle path
  - [ ] Manual verification: ballSort (non-scripted) still works via TypeScript import path
  - [ ] `pnpm generate:registry` succeeds
  - [ ] **EXPECTED**: `ballSortScripted` is REMOVED from `TESTGAMES_BY_ID` (intentional - no game.ts to scan)

  **Commit**: YES
  - Message: `refactor(test-games): convert ballSortScripted to pure bundle format`
  - Files: `app/lib/test-games/games/ballSortScripted/*`, `app/lib/test-games/loadBundleGame.ts`
  - Pre-commit: `bun test`

---

### Task 6: Update Build Script for Script Compilation

- [x] 6. Extend build-game-bundles.mjs to compile script.ts → scripts/game.js

  **What to do**:
  - Add check for `{gameDir}/script.ts` file (in game root, NOT in scripts/)
  - If exists, compile to `{bundleDir}/scripts/game.js`
  - Add to watch mode for script.ts changes
  - Handle compilation errors gracefully

  **REQUIRED: Complete Compilation Specification:**
  
  **Input file path**: `{gameDir}/script.ts` (in game root directory)
  - Example: `app/lib/test-games/games/myGame/script.ts`
  - NOT in `scripts/` subdirectory (that's for output only)
  
  **Output file path**: `{bundleDir}/scripts/game.js`
  - Example: `app/lib/test-games/games/myGame/.bundle/scripts/game.js`
  
  **Full compilation command**:
  ```bash
  npx tsc \
    --outDir {bundleDir}/scripts \
    --module commonjs \
    --target es2020 \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck \
    --declaration false \
    --sourceMap false \
    {gameDir}/script.ts
  ```
  
  **Note**: We use inline flags instead of tsconfig.json for isolation - game scripts shouldn't 
  inherit the main project's TypeScript config which may have incompatible settings.
  
  **Flag Justification Table:**
  | Flag | Value | Reason |
  |------|-------|--------|
  | `--module` | `commonjs` | ScriptSandbox expects `exports.functionName =` pattern (CommonJS) |
  | `--target` | `es2020` | Godot WASM supports modern JS features; matches runtime |
  | `--moduleResolution` | `node` | Standard Node.js resolution for any imports |
  | `--esModuleInterop` | (enabled) | Allows `import x from 'y'` syntax to transpile correctly |
  | `--skipLibCheck` | (enabled) | Faster compilation; script types not needed |
  | `--declaration` | `false` | No .d.ts files needed for runtime scripts |
  | `--sourceMap` | `false` | Source maps not useful for bundled scripts |
  
  **Error handling strategy**:
  ```javascript
  const result = spawnSync('npx', ['tsc', ...flags, scriptPath]);
  if (result.status !== 0) {
    // SKIP this game, log error, continue with other games
    console.error(`TypeScript error in ${gameDir}/script.ts:`);
    console.error(result.stderr.toString());
    // DO NOT fail entire build - other games may still be valid
    continue;
  }
  ```
  
  **Watch mode integration**:
  - Watch path: `{gameDir}/script.ts` (same as input)
  - On change: Re-run compilation, then trigger full bundle rebuild

  **Must NOT do**:
  - Do NOT require script.ts - it's optional
  - Do NOT break existing games without script.ts
  - Do NOT bundle/minify the script output

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small addition to existing script
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of build system

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `app/scripts/build-game-bundles.mjs:22-144` - buildGameBundle function to extend
  - `app/scripts/build-game-bundles.mjs:178-203` - Watch mode to extend

  **Acceptance Criteria**:
  - [ ] Games with script.ts compile to scripts/game.js in bundle
  - [ ] Games without script.ts still build successfully
  - [ ] Watch mode detects script.ts changes
  - [ ] TypeScript compilation errors surface to console

  **Commit**: YES
  - Message: `feat(build): add script.ts compilation to bundle build`
  - Files: `app/scripts/build-game-bundles.mjs`
  - Pre-commit: `node app/scripts/build-game-bundles.mjs`

---

### Task 7: Add Asset Resolution to Compiler

- [ ] 7. Extend compiler to resolve assets from local `assets/` directory or remote URLs

  **What to do**:
  - Add `scanForAssetFiles(dir: string, fileReader: FileReader)` function
    - Scans `assets/` subdirectory for image/sound files (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.mp3`, `.wav`, `.ogg`)
    - Returns array of relative paths with file metadata
  - Update `compileBundle` to:
    - Scan `assets/` directory for local asset files
    - Cross-reference with `assets.json` manifest
    - For each asset in manifest: apply resolution rules (see below)
    - Populate resolved asset references in GameDefinition
  - Add validation: warn if asset referenced in templates but not in manifest

  **CLARIFICATION: Existing validateAssetRefs() Works with New Format:**
  The existing `validateAssetRefs()` function (lines 203-234) checks for `{ asset: "assetId" }` 
  patterns in templates/entities. This works UNCHANGED with the new asset format because:
  - It validates against a `Set<string>` of asset IDs (line 205)
  - Asset IDs come from `Object.keys(rawData.assets)` - same after Task 3
  - The INTERNAL structure of assets (remoteUrl/localPath) is irrelevant to this check
  - Only the asset ID existence matters
  
  **No changes needed** to `validateAssetRefs()` for Task 7.

  **Implementation Location in Compiler (STRUCTURAL ANCHORS - Survives File Changes):**
  
  Asset resolution happens in THREE phases within `compileBundle()`:
  
  **Phase 1: SCANNING**
  - **Anchor**: AFTER the for-loop that processes `jsonFiles` (look for: `for (const filePath of jsonFiles)`)
  - **Insert BEFORE**: The call to `buildGameDefinition()`
  - **Search pattern**: Find the closing brace `}` of the jsonFiles loop, insert after it
  ```typescript
  // After the jsonFiles loop ends:
  const localAssets = scanForAssetFiles(bundlePath, fileReader);
  ```
  
  **Phase 2: VALIDATION**
  - **Anchor**: IMMEDIATELY AFTER `scanForAssetFiles()` call (from Phase 1)
  - **Insert BEFORE**: `buildGameDefinition()` call
  ```typescript
  const validatedAssets = validateAssetReferences(rawData.assets, localAssets, errors);
  ```
  
  **Phase 3: BUILD**
  - **Anchor**: INSIDE `buildGameDefinition()` function
  - **Search pattern**: Find the line containing `imageUrl: asset.path`
  - **Replace that mapping** with the new dual-field structure:
  ```typescript
  // BEFORE (search for this pattern):
  {
    imageUrl: asset.path,
    type: asset.type as 'image' | 'sound',
  }
  
  // AFTER (replace with):
  {
    imageUrl: asset.remoteUrl || asset.path,  // Backwards compat
    localPath: asset.localPath,               // New field (may be undefined)
    type: asset.type as 'image' | 'sound',
  }
  ```
  
  **Verification Steps:**
  1. Find `for (const filePath of jsonFiles)` - this is the JSON processing loop
  2. Find the loop's closing brace - insert Phase 1 & 2 after it
  3. Find `function buildGameDefinition` - Phase 3 goes inside this function
  4. Find `imageUrl: asset.path` - replace this specific mapping
  
  **Migration from Legacy `path` Field:**
  ```typescript
  // In validation phase, normalize legacy format:
  function normalizeAssetEntry(entry: AssetJsonEntry): NormalizedAsset {
    if ('path' in entry && !('remoteUrl' in entry)) {
      // Legacy format: { path: "...", type: "image" }
      return { remoteUrl: entry.path, type: entry.type };
    }
    // New format: { remoteUrl?: "...", localPath?: "...", type: "image" }
    return entry;
  }
  ```

  **Asset Resolution Error Handling:**
  
  | Manifest Entry | Local File Exists? | Result |
  |----------------|-------------------|--------|
  | Has `remoteUrl` AND `localPath` | YES | Use `localPath`, keep `remoteUrl` as fallback |
  | Has `remoteUrl` AND `localPath` | NO | **ERROR** `MISSING_LOCAL_ASSET` - manifest claims local but missing |
  | Has `remoteUrl` only | N/A | Use `remoteUrl` (normal CDN-hosted asset) |
  | Has `localPath` only | YES | Use `localPath` (offline bundle) |
  | Has `localPath` only | NO | **ERROR** `MISSING_LOCAL_ASSET` - file not found |
  | Has NEITHER | N/A | **ERROR** `INVALID_ASSET_REFERENCE` - must have at least one |
  | Referenced in template but NOT in manifest | N/A | **WARNING** `UNKNOWN_ASSET` - may cause runtime error |

  **Rationale**: 
  - Local-only assets are intentional (offline bundles), so missing file is an error
  - Remote-only assets are normal (CDN-hosted), so no local file is expected
  - If manifest explicitly declares `localPath`, the file MUST exist

  **Asset Validation Error Recovery Strategy:**

  | Error Type | Compilation Continues? | Asset Included in Output? | User Impact |
  |------------|------------------------|---------------------------|-------------|
  | `MISSING_LOCAL_ASSET` | **YES** | **NO** (asset excluded) | Runtime error if template references it |
  | `INVALID_ASSET_REFERENCE` | **YES** | **NO** (asset excluded) | Runtime error if template references it |
  | `UNKNOWN_ASSET` (warning) | **YES** | N/A | Runtime error when entity spawns |

  **Rationale for Non-Fatal Errors**: 
  - Asset errors are **non-fatal** - bundle can compile with partial assets
  - Allows iterative development (add assets later)
  - Runtime will show "missing texture" placeholder for broken references
  - Errors are collected in `BundleCompileResult.errors[]` for display to user

  **Implementation Pattern:**
  ```typescript
  // In validateAssetReferences()
  const validatedAssets: Record<string, NormalizedAsset> = {};
  for (const [id, asset] of Object.entries(rawData.assets)) {
    if (asset.localPath && !fileReader.existsSync(path.join(bundlePath, asset.localPath))) {
      errors.push({ code: 'MISSING_LOCAL_ASSET', message: `...`, file: asset.localPath });
      continue;  // SKIP this asset - don't add to validatedAssets
    }
    validatedAssets[id] = asset;  // Only add valid assets
  }
  // Result: gameDefinition.assetPacks.default.assets contains ONLY valid assets
  ```

  **Example assets.json (INPUT):**
  ```json
  {
    "ball": {
      "type": "image",
      "remoteUrl": "https://cdn.example.com/ball.png",
      "localPath": "assets/ball.png"
    },
    "background": {
      "type": "image", 
      "remoteUrl": "https://cdn.example.com/bg.png"
    }
  }
  ```

  **Output Format in GameDefinition.assetPacks (OUTPUT):**
  The compiler outputs BOTH fields when present. Runtime decides which to use.
  
  ```typescript
  // Extend existing AssetPack type (shared/src/types/GameDefinition.ts)
  interface AssetDefinition {
    imageUrl?: string;    // Remote URL (existing field, backwards compat)
    localPath?: string;   // Local path relative to bundle (NEW field)
    type: 'image' | 'sound';
  }
  
  // Example output in gameDefinition.assetPacks:
  {
    default: {
      id: 'default',
      name: 'Default Assets',
      assets: {
        ball: {
          imageUrl: 'https://cdn.example.com/ball.png',  // Remote
          localPath: 'assets/ball.png',                   // Local
          type: 'image'
        },
        background: {
          imageUrl: 'https://cdn.example.com/bg.png',    // Remote only
          type: 'image'
        }
      }
    }
  }
  ```

  **Who Decides Local vs Remote?**: Runtime (asset loader), not compiler.
  - Compiler outputs both fields when available
  - Runtime checks: if `localPath` exists locally → use it; else → use `imageUrl`
  
  **Runtime Integration Status:**
  - **Current runtime does NOT support `localPath`** (uses only `imageUrl`)
  - **This plan adds forward-compatible field**: Runtime will ignore `localPath` until future work
  - **Future work (OUT OF SCOPE)**: Update runtime asset loader to check `localPath` first
  - **For now**: `localPath` is stored in GameDefinition but unused until runtime update
  
  **Why forward-compatible?**: 
  - Bundler can be deployed independently of runtime
  - Games built with `localPath` will work (use remote), just not offline-capable yet
  - Runtime update can be done in separate PR without re-bundling games

  **Must NOT do**:
  - Do NOT download remote assets - read-only operation
  - Do NOT validate image contents - just file existence
  - Do NOT change runtime asset loading - that's separate concern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integrates with multiple parts of compiler
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Understanding of asset system

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `shared/src/bundle/compiler.ts:203-234` - validateAssetRefs pattern
  - `shared/src/bundle/compiler.ts:341-361` - Asset processing in buildGameDefinition
  - `shared/src/types/GameDefinition.ts` - AssetPack structure

  **Acceptance Criteria**:
  - [ ] Test file: `shared/src/bundle/__tests__/asset-resolution.test.ts`
  - [ ] Test covers: Bundle with `assets/ball.png` resolves localPath correctly
  - [ ] Test covers: Bundle with remote URL only uses remoteUrl
  - [ ] Test covers: Bundle with both local and remote outputs BOTH fields
  - [ ] Test covers: Missing asset when localPath declared produces error
  - [ ] Test covers: Asset in template but not manifest produces warning
  - [ ] `cd shared && pnpm test` → PASS
  - [ ] **Runtime Compatibility Verification**: Load compiled bundle with `localPath` in current runtime → runtime uses `imageUrl`, ignores `localPath` (manual test)

  **Commit**: YES
  - Message: `feat(bundle): add asset resolution for local and remote assets`
  - Files: `shared/src/bundle/compiler.ts`, `shared/src/bundle/__tests__/asset-resolution.test.ts`
  - Pre-commit: `cd shared && pnpm test`

---

### Task 8: Integration Tests with Virtual Bundles

- [ ] 8. Create comprehensive integration tests for virtual bundle compilation

  **What to do**:
  - Create `shared/src/bundle/__tests__/virtual-bundle-integration.test.ts`
  - Test: Create VirtualFileReader with full game bundle in memory
  - Test: Compile virtual bundle produces valid GameDefinition
  - Test: Virtual bundle with scripts produces correct gameDefinition.script
  - Test: Virtual bundle with local assets resolves correctly
  - Test: Error handling for malformed virtual files
  - Test: Virtual bundle output identical to real file bundle

  **Reference Test Implementation (CRITICAL - addresses Momus gap):**
  
  ```typescript
  // shared/src/bundle/__tests__/virtual-bundle-integration.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { compileBundle } from '../compiler';
  import { VirtualFileReader } from '../FileReader';
  
  describe('Virtual Bundle Integration', () => {
    // Helper to create minimal valid bundle
    const createMinimalBundle = (overrides: Record<string, string> = {}) => {
      return new Map([
        ['manifest.json', JSON.stringify({ name: 'test-game', version: '1.0.0' })],
        ['templates/player.json', JSON.stringify([{ id: 'player', tags: ['player'] }])],
        ['rules.json', JSON.stringify({ rules: [] })],
        ...Object.entries(overrides).map(([k, v]) => [k, v] as [string, string]),
      ]);
    };
    
    describe('basic compilation', () => {
      it('compiles minimal virtual bundle', () => {
        const files = createMinimalBundle();
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(true);
        expect(result.gameDefinition).toBeDefined();
        expect(result.gameDefinition?.manifest.name).toBe('test-game');
        expect(result.errors).toHaveLength(0);
      });
    });
    
    describe('script handling', () => {
      it('concatenates multiple script files alphabetically', () => {
        const files = createMinimalBundle({
          'scripts/z_last.js': 'exports.onEnd = function(ctx) { return "end"; }',
          'scripts/a_first.js': 'exports.onStart = function(ctx) { return "start"; }',
        });
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(true);
        expect(result.gameDefinition?.script).toContain('// --- a_first.js ---');
        expect(result.gameDefinition?.script).toContain('// --- z_last.js ---');
        // a_first should come BEFORE z_last in the output
        const aIndex = result.gameDefinition?.script?.indexOf('a_first') ?? -1;
        const zIndex = result.gameDefinition?.script?.indexOf('z_last') ?? -1;
        expect(aIndex).toBeLessThan(zIndex);
      });
      
      it('warns on duplicate exports', () => {
        const files = createMinimalBundle({
          'scripts/first.js': 'exports.onStart = function(ctx) { return 1; }',
          'scripts/second.js': 'exports.onStart = function(ctx) { return 2; }', // duplicate!
        });
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(true); // Should still succeed
        expect(result.warnings).toContainEqual(
          expect.objectContaining({ code: 'DUPLICATE_EXPORT' })
        );
      });
      
      it('errors on script without exports', () => {
        const files = createMinimalBundle({
          'scripts/broken.js': 'const x = 42; // no exports!',
        });
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'SCRIPT_SYNTAX_ERROR' })
        );
      });
    });
    
    describe('asset resolution', () => {
      it('resolves assets with both remote and local paths', () => {
        const files = createMinimalBundle({
          'assets.json': JSON.stringify({
            ball: { type: 'image', remoteUrl: 'https://cdn.test/ball.png', localPath: 'assets/ball.png' }
          }),
          'assets/ball.png': '[binary content placeholder]',
        });
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(true);
        const asset = result.gameDefinition?.assetPacks.default.assets.ball;
        expect(asset?.imageUrl).toBe('https://cdn.test/ball.png');
        expect(asset?.localPath).toBe('assets/ball.png');
      });
      
      it('errors when localPath declared but file missing', () => {
        const files = createMinimalBundle({
          'assets.json': JSON.stringify({
            ball: { type: 'image', localPath: 'assets/missing.png' }  // File doesn't exist!
          }),
        });
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'MISSING_LOCAL_ASSET' })
        );
      });
    });
    
    describe('error handling', () => {
      it('errors on invalid JSON', () => {
        const files = new Map([
          ['manifest.json', '{ invalid json }'],
        ]);
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
      
      it('errors on missing manifest', () => {
        const files = new Map([
          ['templates/player.json', JSON.stringify([{ id: 'player' }])],
        ]);
        const fileReader = new VirtualFileReader(files, '/virtual/test-bundle');
        const result = compileBundle('/virtual/test-bundle', { fileReader });
        
        expect(result.success).toBe(false);
      });
    });
  });
  ```

  **Must NOT do**:
  - Do NOT test actual game runtime - just compilation
  - Do NOT test AI generation - just virtual file system

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive test suite requiring understanding of full system
  - **Skills**: [`slopcade-game-engine`, `test-driven-development`]
    - `slopcade-game-engine`: Understanding of bundle system
    - `test-driven-development`: Quality test patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 4, 5, 7

  **References**:
  - `shared/src/bundle/compiler.ts` - compileBundle function being tested
  - `shared/src/bundle/FileReader.ts` - VirtualFileReader implementation
  - `app/lib/test-games/games/ballSortScripted/` - Reference bundle structure (pure bundle after Task 5)

  **Acceptance Criteria**:
  - [ ] Test file: `shared/src/bundle/__tests__/virtual-bundle-integration.test.ts`
  - [ ] Tests cover all virtual bundle scenarios (scripts, assets, JSON)
  - [ ] `cd shared && pnpm test` → PASS (all tests including integration)
  - [ ] Line coverage for compiler.ts > 80% (run `vitest --coverage`)

  **Commit**: YES
  - Message: `test(bundle): add virtual bundle integration tests`
  - Files: `shared/src/bundle/__tests__/virtual-bundle-integration.test.ts`
  - Pre-commit: `cd shared && pnpm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(bundle): add FileReader interface with Node and Virtual implementations` | FileReader.ts, FileReader.test.ts | cd shared && pnpm test |
| 2 | `refactor(bundle): use FileReader abstraction in compiler` | compiler.ts, loader.ts, compiler.test.ts | cd shared && pnpm test |
| 3 | `feat(bundle): add scripts and asset resolution types` | types.ts | tsc --noEmit |
| 4 | `feat(bundle): add script file scanning and processing` | compiler.ts, script-scanning.test.ts | cd shared && pnpm test |
| 5 | `refactor(test-games): convert ballSortScripted to pure bundle format` | ballSortScripted/*, test-games/index.ts | bun test |
| 5 | `refactor(test-games): convert ballSortScripted to pure bundle format` | ballSortScripted/*, test-games/index.ts | bun test |
| 6 | `feat(build): add script.ts compilation to bundle build` | build-game-bundles.mjs | node build-game-bundles.mjs |
| 7 | `feat(bundle): add asset resolution for local and remote assets` | compiler.ts, asset-resolution.test.ts | cd shared && pnpm test |
| 8 | `test(bundle): add virtual bundle integration tests` | virtual-bundle-integration.test.ts | cd shared && pnpm test |

---

## Success Criteria

### Verification Commands
```bash
# All bundle tests pass
cd shared && pnpm test

# TypeScript compiles
cd shared && npx tsc --noEmit

# Build script works
node app/scripts/build-game-bundles.mjs

# Full test suite
bun test
```

### Final Checklist
- [ ] All "Must Have" present (FileReader abstraction, script scanning, asset resolution, backwards compat)
- [ ] All "Must NOT Have" absent (no TypeScript scripts, no execution at compile time, no auto-download)
- [ ] All tests pass
- [ ] VirtualFileReader produces identical output to real files
- [ ] Existing games continue to work
- [ ] New game with external script works
- [ ] Assets resolve from local `assets/` directory when present
- [ ] Assets fall back to remote URL when no local file
- [ ] Bundle structure supports future zip + CDN distribution
