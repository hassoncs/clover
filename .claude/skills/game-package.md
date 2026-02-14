---
name: game-package
description: Use when working with game bundling, package compilation, package validation, game readiness checks, or the game packaging pipeline
---

# Game Package System

Two separate compilation systems exist: the **server-side PackageCompiler** (workspace files → tagged artifacts in R2) and the **local game-bundler** package (bundle directory on disk → GameDefinition). They share the same shared types but serve different contexts.

## When to Use

- Modifying server-side compilation (PackageCompiler, BuildArtifactWriter)
- Debugging package validation errors
- Working with game readiness checks
- Modifying the local bundle compiler (`@slopcade/game-bundler`)
- Understanding the workspace file conventions

## Key Files

| Path | Purpose |
|------|---------|
| `api/src/services/PackageCompiler.ts` | Server-side: workspace files → tagged artifacts in R2 |
| `api/src/services/PackageValidator.ts` | Validates BuildManifest + artifact data |
| `api/src/services/ReadinessService.ts` | Persists readiness state to D1 |
| `api/src/services/BuildArtifactWriter.ts` | Writes build artifacts to R2 bucket |
| `api/src/services/GitWorkspaceReader.ts` | Reads workspace files from git (via GitService + GAME_REPO DO) |
| `api/src/trpc/routes/package-compiler.ts` | tRPC route: `packageCompiler.compile` mutation |
| `api/src/trpc/routes/package-readiness.ts` | tRPC routes: `packageReadiness.check` mutation, `packageReadiness.get` query |
| `packages/game-bundler/src/compiler.ts` | Local: bundle directory → GameDefinition (filesystem-based) |
| `packages/game-bundler/src/types.ts` | Bundle types: RawBundleData, BundleCompileResult, SectionedBundle |
| `packages/game-bundler/src/loader.ts` | Bundle loading: loadBundleSync, isBundleDirectory |
| `packages/game-bundler/src/unified-loader.ts` | Game format detection and loading from path |
| `shared/src/types/PackageRuntime.ts` | TagGroup, BuildManifest, TagPayloads, PackageRuntimeAPI |
| `shared/src/types/PackageManifest.ts` | TAG_GROUPS constant, WorkspaceManifest interface |
| `shared/src/types/GamePackage.ts` | WORKSPACE_CONVENTIONS, GamePackage, AssetManifest |

## Shared Types (from `@slopcade/shared`)

```typescript
// shared/src/types/PackageRuntime.ts
type TagGroup = "world" | "prefabs" | "entities" | "scripts" | "effects" | "assets";

interface PackageArtifact {
  tag: TagGroup;
  hash: string;
  sizeBytes: number;
}

interface BuildManifest {
  packageManifest: WorkspaceManifest;
  buildId: string;
  createdAt: number;
  artifacts: PackageArtifact[];
}

interface TagPayloads {
  world: { world: WorldConfig; background?: BackgroundConfig };
  prefabs: { prefabs: Record<string, EntityPrefab> };
  entities: { entities: GameEntity[] };
  scripts: { modules: Record<string, string> };
  effects: { plans: Record<string, CompiledPlan>; shaders: Record<string, string> };
  assets: { urls: Record<string, string> };
}

// shared/src/types/PackageManifest.ts
const TAG_GROUPS: readonly TagGroup[] = ["world", "prefabs", "entities", "scripts", "effects", "assets"];

interface WorkspaceManifest {
  id: string;
  name: string;
  version: string;
  slug?: string;
  description?: string;
  instructions?: string;
  author?: string;
  entrypoint?: string;
  tagGroups?: TagGroup[];
  createdAt?: number;
  updatedAt?: number;
}
```

## Workspace File Conventions

Defined in `shared/src/types/GamePackage.ts` as `WORKSPACE_CONVENTIONS`:

| Convention Key | Path | Content |
|---------------|------|---------|
| `manifest` | `slopcade.json` | WorkspaceManifest (id, name, version) |
| `world` | `world.json` | WorldConfig (gravity, pixelsPerMeter, bounds) + background |
| `entities` | `entities.json` | Array of GameEntity |
| `prefabsDir` | `prefabs/` | Individual prefab JSON files |
| `scriptsDir` | `scripts/` | `.js` script files (mapped by basename) |
| `effectsDir` | `effects/` | Effect definitions |
| `shadersDir` | `shaders/` | Shader files |
| `assetsDir` | `assets/` | Asset files (images, sounds) |

## Server-Side Compilation (PackageCompiler)

### Pipeline

```
GitWorkspaceReader.readAllFiles(gameId)
        ↓
parseWorkspace(files)  →  ParsedWorkspace { manifest, world, prefabs, entities, rules, scripts, assetUrls }
        ↓
buildTagPayloads(parsed)  →  Map<TagGroup, unknown>  (one payload per tag group)
        ↓
BuildArtifactWriter.writeBuild(gameId, buildId, manifest, artifactData)
        ↓  (writes each tag as `games/{gameId}/build/{buildId}/{tag}.json` to R2)
ReadinessService.checkReadiness(gameId, buildId, manifest, artifacts)
        ↓  (validates + persists to D1 `package_readiness` table)
CompileResult { buildId, manifest, diagnostics, processedFiles, success }
```

### PackageCompiler class

```typescript
// api/src/services/PackageCompiler.ts
class PackageCompiler {
  constructor(
    private readonly reader: WorkspaceReader,
    private readonly writer: BuildArtifactWriter,
  ) {}

  async compile(gameId: string): Promise<CompileResult>
}

interface CompileResult {
  buildId: string;
  manifest: BuildManifest;
  diagnostics: CompileDiagnostic[];
  processedFiles: string[];
  success: boolean;
  artifactData?: Array<{ tag: TagGroup; data: unknown; hash: string }>;
}

interface CompileDiagnostic {
  severity: "error" | "warning";
  message: string;
  file?: string;
  tag?: TagGroup;
}
```

### BuildArtifactWriter class

```typescript
// api/src/services/BuildArtifactWriter.ts
class BuildArtifactWriter {
  constructor(private readonly bucket: R2Bucket) {}

  async writeArtifact(params: WriteArtifactParams): Promise<string>  // returns R2 key
  async writeManifest(gameId: string, buildId: string, manifest: BuildManifest): Promise<string>
  async writeBuild(gameId: string, buildId: string, manifest: BuildManifest,
    artifacts: Array<{ tag: TagGroup; data: unknown; hash: string }>): Promise<WriteBuildResult>
}

// R2 key format: games/{gameId}/build/{buildId}/{tag}.json
```

### GitWorkspaceReader class

```typescript
// api/src/services/GitWorkspaceReader.ts
interface WorkspaceReader {
  listFiles(gameId: string): Promise<string[]>;
  readFile(gameId: string, filePath: string): Promise<string | null>;
  readAllFiles(gameId: string): Promise<WorkspaceReadResult>;
}

class GitWorkspaceReader implements WorkspaceReader {
  constructor(private readonly gitService: GitService) {}
}

interface WorkspaceReadResult {
  files: WorkspaceFile[];  // { path: string; content: string }
  errors: string[];
}
```

## PackageValidator

Validates a `BuildManifest` and its associated `TagPayloads` artifact data. Checks:

- Manifest structure (buildId, packageManifest.id, createdAt, artifacts array)
- Artifact hashes present and tag groups valid
- Prefab IDs unique, physics bodyType valid (`static` | `dynamic` | `kinematic`)
- Entity IDs unique, prefab references resolve
- Script syntax valid, modules present

```typescript
// api/src/services/PackageValidator.ts
class PackageValidator {
  validateBuild(manifest: BuildManifest, artifacts: Partial<TagPayloads>): ValidationResult
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ValidationError {
  code: string;    // e.g. "MISSING_BUILD_ID", "DUPLICATE_PREFAB_ID", "UNKNOWN_PREFAB_REFERENCE"
  message: string;
  path: string;
  severity: "error" | "warning";
}
```

## ReadinessService

Combines validation with D1 persistence. Instantiates its own `PackageValidator` internally.

```typescript
// api/src/services/ReadinessService.ts
class ReadinessService {
  constructor(private readonly db: D1Database) {}

  async checkReadiness(gameId: string, buildId: string,
    manifest: BuildManifest, artifacts: Partial<TagPayloads>): Promise<ReadinessState>
  async getReadiness(gameId: string, buildId: string): Promise<ReadinessState | null>
  async getLatestReadiness(gameId: string): Promise<ReadinessState | null>
}

interface ReadinessState {
  ready: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  buildId: string;
  gameId: string;
  checkedAt: number;
}
```

D1 table: `package_readiness` with columns `game_id`, `build_id`, `ready`, `errors_json`, `warnings_json`, `checked_at`. Uses `ON CONFLICT(game_id, build_id) DO UPDATE`.

## tRPC Routes

### `packageCompiler.compile` (mutation, protected)

```typescript
// api/src/trpc/routes/package-compiler.ts
input: { gameId: z.string().uuid() }
// Verifies game exists and belongs to user
// Creates GitWorkspaceReader → BuildArtifactWriter → PackageCompiler
// Calls compiler.compile(gameId), then readinessService.checkReadiness(...)
output: { success: boolean; buildId: string; diagnostics: CompileDiagnostic[] }
```

### `packageReadiness.check` (mutation, protected)

```typescript
// api/src/trpc/routes/package-readiness.ts
input: { gameId: z.string(); buildId: z.string(); manifest: z.string(); artifacts: z.string() }
// manifest and artifacts are JSON strings, parsed server-side
output: { ready, errors, warnings, buildId, gameId, checkedAt }
```

### `packageReadiness.get` (query, protected)

```typescript
input: { gameId: z.string(); buildId: z.string().optional() }
// If buildId provided, gets specific readiness; otherwise gets latest
output: ReadinessState | null
```

## Local Game Bundler (`@slopcade/game-bundler`)

Filesystem-based compiler for local development. Reads a bundle directory and produces a `GameDefinition`.

### Bundle Directory Structure

```
game-name/
  manifest.json       # Required. Name, title, version, world config, systems
  constants.json      # Optional. Key-value constants (number | string | boolean)
  editor.json         # Optional. Editor metadata for constants
  assets.json         # Optional. Asset registry { id: { path?, remoteUrl?, localPath?, type } }
  effects.json        # Optional. Effect definitions
  templates/          # Prefab JSON files (single object or array)
  entities/           # Entity JSON files
  rules/              # Rule JSON files
  scripts/            # .js files (sorted alphabetically, concatenated, must have exports.X = ...)
  schemas/            # Optional. level.json, persistence.json
  assets/             # Local asset files (.png, .jpg, .mp3, .wav, etc.)
```

### Key Functions

```typescript
// packages/game-bundler/src/compiler.ts
function compileBundle(bundlePath: string, options?: { fileReader?: FileReader }): BundleCompileResult
function compileSectioned(bundlePath: string, fileReader?: FileReader): SectionedCompileResult

// packages/game-bundler/src/loader.ts
function loadBundleSync(bundlePath: string, options?: { fileReader?: FileReader }): LoadBundleResult | null
function isBundleDirectory(dirPath: string, fileReader?: FileReader): boolean

// packages/game-bundler/src/unified-loader.ts
function detectGameFormat(gamePath: string): GameFormat  // "bundle" | "unknown"
function loadGameFromPath(gamePath: string): LoadGameResult
function scanGamesDirectory(baseDir: string, options?: { includeSubdirs?: string[] }): ScanGamesResult[]
```

### Bundle Compile Result Types

```typescript
// packages/game-bundler/src/types.ts
interface BundleCompileResult {
  success: boolean;
  gameDefinition: GameDefinition | null;
  editorMetadata: EditorMetadata | null;
  errors: CompileError[];
  warnings: CompileWarning[];
  rawData: RawBundleData;
  processedFiles: string[];
}

interface SectionedBundle {
  version: string;       // "1.0"
  contentHash: string;   // SHA-256 of sections JSON
  sections: BundleSections;
}

interface BundleSections {
  world: GameDefinition["world"];
  prefabs: GameDefinition["prefabs"];
  entities: GameDefinition["entities"];
  modules?: ScriptModuleMap;
  effects?: GameDefinition["effects"];
  systems?: { match3?; tetris? };
}
```

### Constant References

Bundle JSON files can use `{ "const": "GRAVITY" }` to reference values from `constants.json`. The compiler resolves these during compilation, with cycle detection and Levenshtein-based "did you mean" suggestions.

## Gotchas

- **Two compilation systems**: Server-side `PackageCompiler` reads from git workspace (GAME_REPO DO), local `compileBundle` reads from filesystem. They produce different output formats.
- **Server artifacts are per-tag**: Each TagGroup gets its own JSON file in R2 at `games/{gameId}/build/{buildId}/{tag}.json`.
- **Local bundles use `manifest.json`**: Server workspaces use `slopcade.json` (WORKSPACE_CONVENTIONS.manifest).
- **Script files must export**: Local bundler requires `exports.name = ...` pattern in `.js` files or compilation fails with `SCRIPT_SYNTAX_ERROR`.
- **Validation runs automatically**: The `packageCompiler.compile` tRPC route automatically runs readiness checks after compilation.
- **No PackageReader class exists**: Reading is handled by `GitWorkspaceReader` (server) or `NodeFileReader` (local bundler).

## Related Skills

- **game-authoring**: GameDefinition structure, prefabs, entities, rules
- **storage-ops**: R2 storage for build artifacts, D1 for readiness state
- **effects-system**: Effect compilation and shader pipeline
- **bridge-development**: PackageRuntimeAPI, tag-based loading into Godot
- **ecs-architecture**: Entity/prefab/rule structure
