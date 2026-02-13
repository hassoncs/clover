# MVP E2E Game Lifecycle — Research & Working Context

## Goal
Write an integration test that exercises the **full game lifecycle**: create game → chat with AI → AI edits workspace files → verify files exist → preview/bundle the game. Then manually verify the flow works end-to-end.

---

## Architecture Overview

### The Full Lifecycle

```
1. CREATE GAME          →  tRPC games.create          → D1 row + R2 workspace scaffolded
2. SEND CHAT MESSAGE    →  tRPC chatThreads.sendMessage → D1 thread/message + returns streamUrl
3. AI STREAMS RESPONSE  →  GET /api/chat/stream         → SSE events (AG-UI protocol)
4. AI EDITS FILES       →  writeFile tool               → R2 workspace files (or Git commits)
5. WORKSPACE SNAPSHOT   →  tRPC chatThreads.getWorkspaceSnapshot → all files as JSON
6. PREVIEW GAME         →  Editor reads workspace → PackageCompiler → GameRuntime (Godot)
```

### Key Services & Ports

| Service | Port | Start Command |
|---------|------|---------------|
| API (Cloudflare Workers) | 8789 | `pnpm dev:api` or `devmux ensure api` |
| Metro (React Native) | 8085 | `pnpm dev` or `devmux ensure metro` |
| Web | 8085 | `pnpm web` |

---

## Step-by-Step Flow Details

### Step 1: Create Game — `tRPC games.create`

**File**: `api/src/trpc/routes/games.ts`

- Input: `{ title: string, definition: string (JSON), isPublic?: boolean }`
- Creates D1 row in `games` table with UUID, user_id, r2_prefix
- Stores `definition.json` in R2 at `games/{id}/definition.json`
- The definition JSON follows schema in `api/src/ai/game/schemas.ts`
- Returns `{ id: string }`

### Step 2: Send Message — `tRPC chatThreads.sendMessage`

**File**: `api/src/trpc/routes/chat-threads.ts`

- Input: `{ gameId: string, text: string, threadId?: string }`
- Creates thread in D1 if no threadId provided
- Calls `WorkspaceScaffoldService.seedIfMissing()` to ensure workspace files exist
- Inserts user message into D1 `messages` table
- Returns `{ threadId, streamUrl }` — streamUrl is `/api/chat/stream?threadId=...&token=...`

### Step 3: SSE Stream — `GET /api/chat/stream`

**Files**: `api/src/index.ts` (route), `api/src/chat/stream-handler.ts` (handler)

- Authenticates via `token` query param (in dev, `dev-token` works)
- Loads thread history from D1
- On first message: injects workspace file contents as context
- Calls `streamText()` from Vercel AI SDK with:
  - Model: Configured via `AI_CHAT_MODEL` env var, defaults to `openai/gpt-oss-120b:nitro` (fast tier)
  - System prompt: `CHAT_STAGE_PROMPT` from `api/src/agent/engine/prompts.ts`
  - Tools: from `createChatTools()` in `api/src/chat/chat-tools.ts`
- Streams AG-UI events via SSE: `RUN_STARTED`, `TEXT_MESSAGE_*`, `TOOL_CALL_*`, `RUN_FINISHED`
- After stream completes: persists assistant messages to D1, bills usage

### Step 4: AI Tools (File Operations)

**File**: `api/src/chat/chat-tools.ts`

Available tools:
| Tool | Description |
|------|-------------|
| `readFile` | Read a single workspace file |
| `readFilesBatch` | Read multiple files efficiently |
| `writeFile` | Create/overwrite a file (auto-committed if GitService available) |
| `listFiles` | List workspace files with optional prefix filter |
| `viewHistory` | View Git commit history |
| `readSkill` | Read specialized skill prompts |
| `askUser` | HITL — suspend and ask user a question |

**File storage path**: `games/{gameId}/workspace/{filename}` in R2

**Workspace scaffold files** (created by `WorkspaceScaffoldService`):
- `slopcade.json` — game metadata
- `world.json` — world config (gravity, bounds, background)
- `entities.json` — entity instances (initially empty)
- `rules.json` — game rules (initially empty)
- `prefabs/default.json` — default prefab
- `scripts/main.js` — entry script
- `effects/screen.json` — effect graph

### Step 5: Verify Workspace — `tRPC chatThreads.getWorkspaceSnapshot`

**File**: `api/src/trpc/routes/chat-threads.ts`

- Input: `{ gameId: string, sinceRevision?: string }`
- Returns `{ changed: boolean, snapshot?: { files: [{ filename, content, contentHash, size }] } }`
- Uses GitService if GAME_REPO DO is available, otherwise reads from R2

### Step 6: Preview/Bundle

**Bundling**: `packages/game-bundler/src/compiler.ts` (offline) or `api/src/services/PackageCompiler.ts` (API-side)
- Reads workspace files → compiles into `GameDefinition` or `BuildManifest`

**Preview routes**:
- `/app/editor/[id]` — Full editor with live preview, chat panel, file explorer
- `/app/play/[id]` — Play a saved game
- `/app/play/preview` — Play from ephemeral definition JSON

**Runtime**: `app/lib/game-engine/GameRuntime.godot.tsx`
- Uses `GodotBridge` (WASM on web, native on iOS/Android)
- `HotReloadOrchestrator` for live updates during editing

---

## Existing Integration Test

**File**: `api/src/chat/__tests__/stream-integration.test.ts`

This test already does steps 1-3:
1. Creates a game via `trpcMutation("games.create", ...)`
2. Sends a message via `trpcMutation("chatThreads.sendMessage", ...)`
3. Reads SSE stream and verifies `RUN_STARTED`, `TEXT_MESSAGE_CONTENT`, `RUN_FINISHED`

**What it does NOT do**:
- Does NOT verify the AI called `writeFile` to create workspace files
- Does NOT check workspace contents after the chat
- Does NOT verify the game is "playable" (bundleable)
- Uses a simple prompt ("Say hello in one short sentence") that won't trigger file writes

**Test infrastructure**:
- Runs against a live local API server at `http://localhost:8789`
- Uses `Authorization: Bearer dev-token` for auth (dev mode)
- Dev user: `00000000-0000-0000-0000-000000000000` (seeded in schema.sql)
- Requires `hush run --` to provide `OPENROUTER_API_KEY`
- SSE stream has 30s timeout, overall test has 60s timeout

---

## Dev Environment Config

- **Auth**: In dev mode (`__DEV__ = "true"` in wrangler.toml), `dev-token` authenticates as the dev user
- **AI Provider**: OpenRouter API key via hush (`OPENROUTER_API_KEY`)
- **Default chat model**: `openai/gpt-oss-120b:nitro` (fast tier) — cheapest
- **DB**: Local D1 (SQLite) at `.wrangler/state/v3/d1/`
- **R2**: Local R2 at `.wrangler/state/v3/r2/`
- **Durable Objects**: `GAME_REPO` (GameRepoDO) and `REALTIME_RELAY` (RealtimeRelayDO)

---

## Integration Test Plan

### What We Need

A single integration test that:
1. Creates a game
2. Sends a chat message asking the AI to **actually create game content** (e.g., "Create a simple ball bouncing game with one ball entity")
3. Reads the SSE stream to completion
4. Verifies the AI called `writeFile` by checking `TOOL_CALL_START`/`TOOL_CALL_RESULT` events in the stream
5. Fetches the workspace snapshot and verifies files were created/modified
6. Optionally: validates the workspace files are well-formed JSON

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real AI or mock? | **Real AI** | User explicitly wants real AI integration test |
| Which model? | Default (fast tier) | Cheapest, fastest for testing |
| Timeout? | 120s | AI file generation takes longer than simple text |
| Test location? | `api/src/chat/__tests__/` | Alongside existing stream-integration test |

### Prompt Strategy

The prompt needs to reliably trigger `writeFile` calls. Good options:
- "Create a simple game with a bouncing ball. Write the world.json, a ball prefab, and entities.json."
- "Add a red circle entity that falls with gravity. Update the workspace files."

The system prompt (`CHAT_STAGE_PROMPT`) already instructs the AI to use `writeFile`, so a clear request should work.

---

## Manual Testing Checklist

After the integration test passes, verify the full visual flow:

1. [ ] Start services: `pnpm dev` (Metro + API)
2. [ ] Open web: `http://localhost:8085`
3. [ ] Log in (dev mode or Supabase auth)
4. [ ] Create a new game from the UI
5. [ ] Open the editor for that game
6. [ ] Send a chat message asking AI to create game content
7. [ ] Verify: AI responds with text AND makes file changes
8. [ ] Verify: File explorer in editor shows updated files
9. [ ] Verify: Live preview panel shows the game rendering
10. [ ] Verify: Can play the game from the play route

---

## CRITICAL: Dual Storage Architecture (Git vs R2)

### The Problem

Game workspace files are stored in **two disconnected systems** that don't sync:

```
R2 Bucket (flat files)                    Git DO (isomorphic-git over R2)
─────────────────────                     ─────────────────────────────
games/{id}/workspace/world.json           repos/{id}/.git/objects/...
games/{id}/workspace/entities.json        (committed as git blobs)
games/{id}/workspace/prefabs/ball.json    
```

- The **editor UI** reads/writes **R2 directly** (`listWorkspaceFiles`, `readWorkspaceFile`, `writeWorkspaceFile`)
- The **AI chat tools** read/write **Git** (`gitService.readFile`, `gitService.commitFiles`)
- The **live preview** uses `getWorkspaceSnapshot` which reads from **Git** (if available)
- These never sync after initial game creation

### Who Reads Where

| Consumer | Source | Endpoint |
|----------|--------|----------|
| File Explorer (tree) | **R2** | `listWorkspaceFiles` — R2 `ASSETS.list` |
| File Viewer (content) | **R2** | `readWorkspaceFile` — R2 `ASSETS.get` |
| File Save (editor) | **R2** | `writeWorkspaceFile` — R2 `ASSETS.put` |
| AI readFile tool | **Git** | `gitService.readFile` (fallback: `ArtifactService` R2) |
| AI writeFile tool | **Git** | `gitService.commitFiles` (fallback: `ArtifactService` R2) |
| AI listFiles tool | **Git** | `gitService.listFiles` (fallback: `ArtifactService` R2) |
| Live Preview snapshot | **Git** | `getWorkspaceSnapshot` (fallback: R2) |
| Workspace scaffold | **R2** | `WorkspaceScaffoldService.seedIfMissing` |
| Package compiler | **R2** | `R2WorkspaceReader.readAllFiles` |

### Who Writes Where

| Writer | Destination | When |
|--------|-------------|------|
| Game creation | **R2** then **Git** | `games.create` → scaffold R2 → `initGitRepoWithWorkspace` copies R2→Git |
| AI chat (writeFile) | **Git only** | `chat-tools.ts` → `gitService.commitFiles` |
| Editor save | **R2 only** | `writeWorkspaceFile` → `ASSETS.put` |
| Scaffold | **R2 only** | `WorkspaceScaffoldService` |

### The Consequence

1. User creates game → files seeded in R2 → copied to Git (one-time sync)
2. User chats with AI → AI writes to Git → **R2 is now stale**
3. User opens Explorer → reads from R2 → **sees stale scaffold files, not AI changes**
4. Live preview reads from Git → sees AI changes correctly
5. User edits a file in the editor → writes to R2 only → **Git is now stale**

### Current File Explorer Bug

`useWorkspaceFiles.ts` accesses `filesQuery.data?.files`, `data?.tree`, `data?.roots` but `listWorkspaceFiles` returns a flat array `[{ filename, size, uploaded }]`. The data shape mismatch means the tree is always empty — **even if R2 had files, the explorer wouldn't show them**.

---

## Architecture Decision: GameRepoDO as Unified File Gateway

### The Model: Working Tree + Git Checkpoints

Git is hidden infrastructure, not user-facing. Users never see commits, branches, or Git UI.

```
GameRepoDO (one per game)
│
├── Working Tree (hot state — all current files)
│   ├── Stored in DO transactional storage
│   ├── ALL reads/writes go here (editor, AI, preview)
│   ├── Can broadcast changes via WebSocket for real-time collab
│   └── This is what everyone sees as "the current file"
│
└── Git History (cold state — checkpoints)
    ├── Stored via isomorphic-git + R2Fs (already exists)
    ├── Auto-checkpoint triggers:
    │   - AI finishes a batch of writes → auto-commit
    │   - Idle timeout after last human edit → auto-commit
    │   - Before fork/publish → auto-commit
    ├── User can revert to any checkpoint
    └── Fork = fork the Git history
```

### Why This Model

1. **Editor saves shouldn't create commits** — humans edit frequently, commits should be meaningful checkpoints
2. **AI writes are already commit-worthy** — each AI tool batch is a logical unit of work  
3. **Real-time collaboration** — the DO can broadcast file changes to multiple connected editors
4. **Forking** — Git makes forking natural (fork = clone git history)
5. **File sizes** — all text files (JSON, MD, JS), entire workspace is <100KB, DO storage handles this easily
6. **No duplication** — working tree IS the current state, Git is just checkpoints of that state

### DO API Design

The `GameRepoDO` needs these operations:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/init` | POST | Initialize repo + empty working tree |
| `/write` | POST | Write file(s) to working tree |
| `/read/{path}` | GET | Read file from working tree |
| `/tree` | GET | List all files in working tree |
| `/commit` | POST | Snapshot working tree into Git commit |
| `/log` | GET | View Git commit history |
| `/diff` | GET | Diff between two commits |
| `/revert` | POST | Revert working tree to a specific commit |
| `/snapshot` | GET | Get all files + revision for live preview polling |

### Callers

| Caller | Operations | Commit behavior |
|--------|-----------|----------------|
| AI chat tools | write, read, list | Auto-commit after AI turn completes |
| Editor UI | write, read, list | Auto-commit after idle timeout (e.g., 30s) |
| Workspace scaffold | write | Auto-commit immediately (initial state) |
| Live preview | snapshot | Read-only, polls for changes |
| PackageCompiler | read all | Read-only, reads working tree |
| Fork | Git-level copy | Copies both working tree + Git history |

### Implementation Plan

**Phase 1 — Redesign GameRepoDO:**
- Add working tree storage (DO transactional storage: `Map<string, string>`)
- Add `/write` endpoint (writes to working tree, NOT git)
- Update `/read` to read from working tree first, fall back to git HEAD
- Update `/tree` to list working tree files
- Add `/snapshot` endpoint for live preview (returns all files + a revision hash)
- Keep `/commit` for explicit checkpoints
- Add `/revert` to restore working tree from a git commit

**Phase 2 — Update GitService interface:**
- Add `writeFiles(gameId, files)` — writes to working tree (no commit)
- Add `getSnapshot(gameId, sinceRevision?)` — returns current working tree state
- Keep `commitFiles` for explicit commits
- Keep `readFile`, `listFiles`, `log`, etc.

**Phase 3 — Rewire all callers:**
- chat-tools: `writeFile` → `gitService.writeFiles`, auto-commit at end of AI turn
- Editor tRPC: `writeWorkspaceFile` → `gitService.writeFiles` (no commit)
- Scaffold: `writeFiles` → immediate `commit`
- `listWorkspaceFiles` → `gitService.listFiles` + build tree
- `readWorkspaceFile` → `gitService.readFile`
- PackageCompiler → `GitWorkspaceReader` reads from working tree
- Remove all R2 workspace paths

**Phase 4 — Auto-commit logic:**
- Stream handler: after AI stream completes, call `gitService.commitFiles` 
- Editor: debounced auto-commit after idle timeout (client-side timer → server call)

---

## Key File Reference

| Purpose | Path |
|---------|------|
| Game CRUD routes | `api/src/trpc/routes/games.ts` |
| Chat thread routes | `api/src/trpc/routes/chat-threads.ts` |
| SSE stream handler | `api/src/chat/stream-handler.ts` |
| Chat tools (writeFile etc) | `api/src/chat/chat-tools.ts` |
| AG-UI mapper | `api/src/chat/agui-mapper.ts` |
| System prompt | `api/src/agent/engine/prompts.ts` |
| AI model config | `api/src/ai/chat-model-config.ts` |
| Workspace scaffold | `api/src/services/WorkspaceScaffoldService.ts` |
| Existing stream test | `api/src/chat/__tests__/stream-integration.test.ts` |
| DB schema | `api/schema.sql` |
| Wrangler config | `api/wrangler.toml` |
| Editor screen | `app/app/editor/[id].tsx` |
| Play screen | `app/app/play/[id].tsx` |
| Game bundler | `packages/game-bundler/src/compiler.ts` |
| Package compiler | `api/src/services/PackageCompiler.ts` |
| Game runtime | `app/lib/game-engine/GameRuntime.godot.tsx` |
| Hot reload | `app/lib/game-engine/live/HotReloadOrchestrator.ts` |
| Tag payload resolver | `app/lib/game-engine/live/TagPayloadResolver.ts` |
| Workspace files hook | `app/components/editor/useWorkspaceFiles.ts` |
| Editor file tree hook | `app/components/editor/useEditorFileTree.ts` |
| Explorer panel | `app/components/editor/panels/ExplorerPanel.ts` |
| Stage area (tabs) | `app/components/editor/StageArea.tsx` |
| GitService | `api/src/services/git/GitService.ts` |
| GameRepoDO | `api/src/durable-objects/GameRepoDO.ts` |
| R2Fs (Git storage) | `api/src/services/git/R2Fs.ts` |
| ArtifactService | `api/src/agent/artifact-service.ts` |
| R2WorkspaceReader | `api/src/services/R2WorkspaceReader.ts` |
| ForkService | `api/src/services/ForkService.ts` |
