---
description: Use when working with workspace management, Git operations (commit, branch, tag, fork), workspace scaffolding, copying workspaces, or git-based game storage
---

# Workspace System

Game workspaces are git repositories backed by R2 storage, managed through a Durable Object (`GameRepoDO`) that wraps `isomorphic-git`.

## Architecture

```
GitService (TS client)  ──HTTP──▶  GameRepoDO (Durable Object)
                                       │
                                       ├── isomorphic-git
                                       ├── R2Fs (R2-backed filesystem)
                                       ├── CachedR2Fs (LRU cache layer)
                                       └── DurableObject storage (working tree)
```

Two R2 prefix schemes coexist:
- **Git repos**: `repos/{gameId}/.git/` — bare git objects, refs, HEAD
- **Legacy workspace**: `games/{gameId}/workspace/` — flat file copies (used by `R2WorkspaceReader`, `WorkspaceCopyService`)

## File Map

| Path | Class/Export | Purpose |
|------|-------------|---------|
| `api/src/durable-objects/GameRepoDO.ts` | `GameRepoDO` | Durable Object — real git implementation via isomorphic-git |
| `api/src/services/git/GitService.ts` | `GitService` | TypeScript client that calls GameRepoDO over HTTP |
| `api/src/services/git/R2Fs.ts` | `R2Fs`, `FsPromises` | Node-fs-like interface backed by R2 |
| `api/src/services/git/CachedR2Fs.ts` | `CachedR2Fs` | LRU cache wrapper around R2Fs (64MB default) |
| `api/src/services/ForkService.ts` | `ForkService` | Copies git objects in R2 + inserts DB row |
| `api/src/services/WorkspaceScaffoldService.ts` | `WorkspaceScaffoldService` | Seeds new repos with default files |
| `api/src/services/WorkspaceCopyService.ts` | `WorkspaceCopyService` | Copies flat workspace files in R2 |
| `api/src/services/GitWorkspaceReader.ts` | `GitWorkspaceReader` | Reads workspace files via GitService |
| `api/src/services/R2WorkspaceReader.ts` | `R2WorkspaceReader` | Reads workspace files directly from R2 |

## GameRepoDO

Cloudflare Durable Object exported from `api/src/index.ts`. Uses `isomorphic-git` with `R2Fs`/`CachedR2Fs` as the filesystem backend. Maintains a working tree in DO storage (keys prefixed `wt:`).

```typescript
// api/src/durable-objects/GameRepoDO.ts
export class GameRepoDO {
  constructor(state: DurableObjectState, env: { ASSETS: R2Bucket }) {}
  async fetch(request: Request): Promise<Response> {}
}
```

**HTTP routes handled by `fetch()`:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/init` | Initialize git repo (`git.init`) + seed working tree from HEAD |
| POST | `/commit` | Write files, `git.add`, `git.commit`, broadcast via WebSocket |
| GET | `/read/{filepath}?ref=` | Read file from working tree (or from ref if specified) |
| GET | `/tree?ref=` | List files in working tree (or at ref) |
| GET | `/log?depth=` | Git log (default depth 20) |
| POST | `/branch` | Create branch (`{ name, ref? }`) |
| POST | `/tag` | Create tag (`{ name, ref? }`) |
| GET | `/diff?refA=&refB=` | Tree diff between two refs |
| POST | `/write` | Write files to working tree only (no commit) |
| GET | `/snapshot?sinceRevision=` | Full workspace snapshot with FNV-1a revision hash |
| WS | (upgrade) | WebSocket for `FILE_CHANGED` broadcasts |

**WebSocket messages broadcast on commit/write:**
```json
{ "type": "FILE_CHANGED", "gameId": "...", "filename": "..." }
```

## GitService

TypeScript client that proxies to `GameRepoDO` via HTTP. All methods take `gameId` as first param — used to derive the DO stub via `doNamespace.idFromName(gameId)`.

```typescript
// api/src/services/git/GitService.ts
export class GitService {
  constructor(doNamespace: DurableObjectNamespace) {}

  async initRepo(gameId: string): Promise<void>
  async commitFiles(gameId: string, files: FileChange[], message: string, author: Author): Promise<string>
  async readFile(gameId: string, path: string, ref?: string): Promise<Uint8Array | null>
  async listFiles(gameId: string, ref?: string): Promise<string[]>
  async log(gameId: string, depth?: number): Promise<Commit[]>
  async createBranch(gameId: string, name: string, ref?: string): Promise<void>
  async createTag(gameId: string, name: string, ref?: string): Promise<void>
  async diffTrees(gameId: string, refA: string, refB: string): Promise<FileDiff[]>
  async writeFiles(gameId: string, files: FileChange[]): Promise<void>
  async getSnapshot(gameId: string, sinceRevision?: string): Promise<{
    changed: boolean; revision: string;
    files?: Array<{ filename: string; content: string; contentHash: string; size: number }>
  }>
}

export interface FileChange { path: string; content: string }
export interface Author { name: string; email: string }
export interface Commit {
  oid: string; message: string;
  author: { name: string; email: string; timestamp: number };
  committer?: { name: string; email: string; timestamp: number };
  parent?: string[]; tree?: string;
}
export interface FileDiff { path: string; type: "add" | "modify" | "delete" }
```

**Instantiation** (from tRPC routes):
```typescript
const gitService = new GitService(ctx.env.GAME_REPO);
```

## ForkService

Copies all R2 objects under `repos/{sourceGameId}/.git/` to `repos/{newGameId}/.git/`, inserts a `games` DB row, and initializes the forked repo's Durable Object.

```typescript
// api/src/services/ForkService.ts
export class ForkService {
  constructor(assets: R2Bucket, db: D1Database, gameRepoNamespace: DurableObjectNamespace | undefined) {}
  async forkGame(params: ForkParams): Promise<ForkResult>
}

export interface ForkParams {
  sourceGameId: string; newGameId: string; userId: string;
  title: string; description: string | null; r2Prefix: string;
  baseGameId: string;
  validationReport: string | null; validationScore: number | null;
  validationCriticalCount: number; validationWarningCount: number;
  validationValid: number; validatorVersion: string | null;
}

export interface ForkResult { gameId: string; copiedObjectCount: number }
```

## WorkspaceScaffoldService

Seeds a new game repo with default files if they don't already exist. Uses `GitService.commitFiles()` to create an initial commit.

```typescript
// api/src/services/WorkspaceScaffoldService.ts
export class WorkspaceScaffoldService {
  constructor(gitService: GitService) {}
  async seedIfMissing(options: SeedWorkspaceScaffoldOptions): Promise<SeedWorkspaceScaffoldResult>
}

export interface SeedWorkspaceScaffoldOptions { gameId: string; gameTitle?: string }
export interface SeedWorkspaceScaffoldResult { created: string[]; skipped: string[] }
```

**Default scaffold files:**
- `slopcade.json` — game manifest (id, name, version, activeScene)
- `world.json` — world config (gravity, pixelsPerMeter, bounds, background)
- `entities.json` — empty array
- `prefabs/default.json` — default prefab
- `scripts/main.js` — empty onStart/onUpdate
- `effects/screen.json` — empty shader graph

## WorkspaceCopyService

Copies flat workspace files in R2 (under `{prefix}/workspace/`). Optionally patches `slopcade.json` with new id/title.

```typescript
// api/src/services/WorkspaceCopyService.ts
export class WorkspaceCopyService {
  constructor(bucket: R2Bucket) {}
  async copyWorkspace(options: WorkspaceCopyOptions): Promise<WorkspaceCopyResult>
}

export interface WorkspaceCopyOptions {
  sourcePrefix: string; destPrefix: string;
  metadataOverrides?: { id?: string; title?: string }
}
export interface WorkspaceCopyResult { copiedFiles: string[]; updatedFiles: string[]; skipped: boolean }
```

## Workspace Readers

Two implementations of the same pattern — read workspace files by gameId:

```typescript
// api/src/services/GitWorkspaceReader.ts
export interface WorkspaceReader {
  listFiles(gameId: string): Promise<string[]>
  readFile(gameId: string, filePath: string): Promise<string | null>
  readAllFiles(gameId: string): Promise<WorkspaceReadResult>
}

export class GitWorkspaceReader implements WorkspaceReader {
  constructor(gitService: GitService) {}
}

// api/src/services/R2WorkspaceReader.ts
export class R2WorkspaceReader {
  constructor(bucket: R2Bucket) {}
  // Same method signatures: listFiles, readFile, readAllFiles
  // Reads from R2 prefix: games/{gameId}/workspace/
}

export interface WorkspaceFile { path: string; content: string }
export interface WorkspaceReadResult { files: WorkspaceFile[]; errors: string[] }
```

## R2Fs / CachedR2Fs

Node `fs.promises`-compatible interface backed by R2. Used by `GameRepoDO` as the filesystem for `isomorphic-git`.

```typescript
// api/src/services/git/R2Fs.ts
export class R2Fs {
  constructor(bucket: R2Bucket, prefix: string) {}
  get promises(): FsPromises
}

export interface FsPromises {
  readFile(path: string, options?: { encoding?: string } | string): Promise<Uint8Array | string>
  writeFile(path: string, data: Uint8Array | string, options?: ...): Promise<void>
  unlink(path: string): Promise<void>
  readdir(path: string, options?: unknown): Promise<string[]>
  mkdir(path: string, options?: { recursive?: boolean } | number): Promise<void>
  rmdir(path: string, options?: unknown): Promise<void>
  stat(path: string): Promise<StatResult>
  lstat(path: string): Promise<StatResult>
}

// api/src/services/git/CachedR2Fs.ts
export class CachedR2Fs {
  constructor(inner: R2Fs, maxCacheBytes?: number) {}  // default 64MB
  get promises(): FsPromises
  clearCache(): void
  get cacheSize(): number
  get cacheBytes(): number
}
```

**Cache strategy:** LRU with content-aware TTLs:
- `objects/`, `.idx`, `.pack` → immutable (no TTL, cached forever)
- `refs/`, `HEAD`, `packed-refs` → 5 second TTL
- Everything else → not cached

## tRPC Integration

Services are used in these tRPC routes:

| Route file | Service usage |
|-----------|---------------|
| `api/src/trpc/routes/games.ts` | `GitService` + `WorkspaceScaffoldService` on game create; `WorkspaceCopyService` + `ForkService` on fork |
| `api/src/trpc/routes/chat-threads.ts` | `GitService` for workspace snapshots, file reads/writes, scaffolding |
| `api/src/trpc/routes/package-compiler.ts` | `GitWorkspaceReader` to read workspace for compilation |

**Env binding:** `GAME_REPO` (DurableObjectNamespace) — used to construct `GitService`.

## Workflow: Fork a Game

```
games.fork tRPC mutation
  ├── WorkspaceCopyService.copyWorkspace()  — copies games/{id}/workspace/ files
  └── ForkService.forkGame()
        ├── Copy all R2 objects: repos/{source}/.git/ → repos/{new}/.git/
        ├── INSERT INTO games (with forked_from_id, base_game_id)
        └── Init forked GameRepoDO via POST /init
```

## Workflow: Create a Game

```
games.create tRPC mutation
  ├── INSERT INTO games
  ├── GitService.initRepo(gameId)  — POST /init to GameRepoDO
  └── WorkspaceScaffoldService.seedIfMissing()
        ├── GitService.listFiles() — check existing files
        └── GitService.commitFiles() — commit scaffold files
```

## Gotchas

- **Dual storage paths**: Git objects live at `repos/{gameId}/.git/` while legacy workspace copies live at `games/{gameId}/workspace/`. Both may exist for the same game.
- **Working tree in DO storage**: `GameRepoDO` maintains a working tree in Durable Object storage (keys prefixed `wt:`), separate from the git objects in R2. Reads without a `ref` param return from this working tree.
- **GAME_REPO binding**: `GitService` requires the `GAME_REPO` DurableObjectNamespace binding. Code guards against it being undefined (e.g., `ForkService.initForkedRepoDO` logs a warning and skips).
- **isomorphic-git**: The actual git implementation. Only used inside `GameRepoDO` — `GitService` is just an HTTP client.
- **CachedR2Fs 64MB limit**: Conservative for Workers 128MB memory limit. Git objects are cached forever (content-addressable), refs expire after 5s.
- **WebSocket broadcasts**: `GameRepoDO` broadcasts `FILE_CHANGED` messages on commit and write operations to connected WebSocket clients.

## Related Skills

- **storage-ops**: R2 bucket operations, D1 database
- **ecs-architecture**: Game workspace file structure (prefabs, entities, rules)
- **game-authoring**: GameDefinition and workspace content
