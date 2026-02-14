# Code Indexing Evaluation Report

## Goal
Evaluate local code indexing tools to help AI agents find code and documentation faster in the slopcade repository. Compare four tools head-to-head.

## Repository Stats
- 1,279 source files (TS/TSX/GD/MD) = 6.8MB of actual source
- 1,466 total indexable files (including configs) = 8.7MB
- Excluding: node_modules, .venv, gdUnit4 addons, build artifacts, vendored JS

---

## Tool Comparison

### 1. mcp-local-rag (tested)
- **Type**: Node.js MCP server, LanceDB, Transformers.js embeddings
- **Install**: `npx -y mcp-local-rag` (zero config)
- **Index time**: ~30 min for 1,279 files (0.7-1.5 files/sec via MCP stdio)
- **DB size**: ~72MB (LanceDB)
- **Chunks**: 40,088
- **TS support**: Workaround only — must read file and send as text via `ingest_data`
- **Incremental**: No — manual re-ingest per file
- **File watcher**: No
- **Search speed**: Not measured directly (MCP overhead)
- **MCP tools**: `query_documents`, `ingest_file`, `ingest_data`, `list_files`, `delete_file`, `status`

### 2. codesearch (tested)
- **Type**: Rust binary, LMDB, fastembed ONNX, tree-sitter AST
- **Install**: Build from source (`cargo build --release`), no macOS binary yet
- **Index time**: ~7 min for 1,466 files (CPU-intensive embedding generation)
- **DB size**: 183MB (LMDB + ANN index + FTS index)
- **Chunks**: 31,159
- **TS support**: Native — tree-sitter AST parses functions, classes, interfaces
- **Incremental**: Yes — only re-indexes changed files (10-100x faster)
- **File watcher**: Yes — built into MCP server mode
- **Search speed**: 73-101ms per query
- **MCP tools**: `semantic_search`, `find_references`, `get_file_chunks`, `find_databases`, `index_status`

### 3. tsg_indexer (evaluated, not tested)
- **Type**: Rust library using tree-sitter Stack Graphs
- **Stars**: 10, 2 commits — very early/experimental
- **What it does**: Builds a graph of definitions ↔ references across files using stack-graphs (GitHub's code navigation tech). Outputs JSON or DOT graph.
- **MCP**: Not built-in — it's a library, not a server. Would need wrapping.
- **Strengths**: Cross-file reference resolution (knows that `importedFn` in file A comes from file B). 20+ language support.
- **Weaknesses**: No search — it's an indexer only. No embeddings, no semantic search. No MCP server. Only 2 commits, no releases. Would need significant work to use as an agent tool.
- **Verdict**: Interesting technology (stack-graphs) but not ready to use. More of a building block than a tool.

### 4. coderlm (evaluated, not tested)
- **Type**: Rust server + Claude Code plugin, tree-sitter indexing, HTTP API
- **Stars**: 144, actively maintained
- **What it does**: Implements the "Recursive Language Model" pattern — indexes a project via tree-sitter, exposes a REST API for symbol search, callers, implementations, grep. Comes with a Claude Code plugin with hooks.
- **MCP**: Not MCP-native — uses HTTP REST API + Claude Code plugin/skill wrapper. Would need an MCP adapter for OpenCode.
- **Strengths**: Rich API (search symbols, find callers, get implementations, grep, file tree). Purpose-built for LLM agents. Plugin auto-initializes on Claude Code session start.
- **Weaknesses**: Not MCP-native (HTTP server on port 3000). Claude Code-specific plugin system. No semantic/vector search — purely AST-based symbol lookup + text grep. Limited language support (Rust, Python, TS, JS, Go only).
- **Verdict**: Well-designed for Claude Code users. The REST API is comprehensive. But no semantic search means it's more like a structured grep than a knowledge base. Would need MCP wrapping for OpenCode.

---

## Head-to-Head Benchmark Results

### Test queries run against both mcp-local-rag and codesearch:

| # | Query | mcp-local-rag Winner? | codesearch Winner? | Notes |
|---|-------|----------------------|-------------------|-------|
| 1 | "How does authentication work?" | ✅ Found auth-system skill + actual auth code | ❌ Found test file + generic auth string | RAG found the skill doc; codesearch found code but less relevant |
| 2 | "Metro port 8085 configuration" | ✅ Found exact answer from 3 sources (docs, skill, AGENTS.md) | ⚠️ Found the port number but in wrong context (game-inspector) | RAG clearly better — found documentation explaining the config |
| 3 | "GameDefinition type interface" | ✅ Found skill doc + actual import statement | ⚠️ Found related interfaces but not GameDefinition itself | RAG found the documentation; codesearch found code but wrong type |
| 4 | "How to run tests vitest" | ✅ Found testing docs + skill reference | ✅ Found test README + bridge docs | Both reasonable; RAG slightly more useful results |
| 5 | "Wallet currency sparks gems" | ✅ Found BuyGemsModal, economy docs, wallet-service path | ✅ Found economy INDEX.md + gem-service test | Both good; RAG returned more specific results |

### Scoring Summary

| Metric | mcp-local-rag | codesearch |
|--------|--------------|------------|
| **Doc/convention queries** (1,2,4) | ★★★★★ | ★★☆☆☆ |
| **Symbol/type queries** (3) | ★★★★☆ | ★★★☆☆ |
| **Feature discovery** (5) | ★★★★★ | ★★★★☆ |
| **Search speed** | Unknown (MCP overhead) | 73-101ms |
| **Index time** | ~30 min | ~7 min |
| **Incremental re-index** | ❌ Manual | ✅ Automatic |
| **File watcher** | ❌ | ✅ Built-in |
| **TS/code support** | ⚠️ Workaround | ✅ Native AST |
| **Markdown/docs support** | ✅ Native | ✅ Line-based |
| **Setup complexity** | ★☆☆☆☆ (npx) | ★★★☆☆ (build from source) |
| **Token efficiency** | Returns full text chunks | Compact mode (~40 tokens/result) |

---

## Key Findings

### 1. mcp-local-rag is better for documentation search
It excels at finding project conventions, skill content, and documentation. When I ask "how does X work?", it finds the right skill file or doc. This is because it indexes markdown natively and its text-based chunking preserves prose context well.

### 2. codesearch is better for code navigation
Its AST-aware chunking means it understands functions, classes, and interfaces. The `find_references` tool is something mcp-local-rag doesn't have. Its compact mode (40 tokens/result) is much more token-efficient. Incremental indexing + file watcher means it stays current without manual re-ingestion.

### 3. Neither is a silver bullet
- mcp-local-rag: Can't natively index TS (workaround is fragile), no incremental, no watcher, slow ingest
- codesearch: Weak on documentation/prose queries, crashed on first index (LMDB map limit), requires building from source, 183MB DB

### 4. The two complement each other
The ideal setup might be both:
- **codesearch** for code navigation (symbols, references, implementations)
- **mcp-local-rag** for documentation search (skills, AGENTS.md, docs/)

But running two indexers is maintenance overhead.

### 5. coderlm is interesting but not MCP-native
If we were using Claude Code exclusively, coderlm would be compelling — its plugin system is well-designed. But it's not MCP, so it doesn't work with OpenCode without an adapter.

### 6. tsg_indexer is too early
Only 2 commits, no releases, no MCP, no search. The stack-graphs technology is powerful but the tool isn't ready.

---

## Recommendation

**Use codesearch as the primary tool**, with these caveats:

1. **Why codesearch wins overall:**
   - Native TS/TSX/GD/Python AST parsing
   - Incremental indexing + file watcher (zero maintenance)
   - Sub-100ms search
   - Token-efficient compact mode
   - Built-in MCP server designed for OpenCode
   - `.codesearchignore` for easy configuration

2. **Mitigate its documentation weakness:**
   - Keep the current skill-loading system (AGENTS.md + .claude/skills/) as the primary documentation delivery mechanism
   - codesearch can still find markdown files, just not as well for prose-based queries
   - The skill system is already a manual RAG that works 90% of the time

3. **Setup:**
   - Add codesearch MCP to opencode.json
   - Create `.codesearchignore` (already done)
   - Run `codesearch index` once after initial setup
   - MCP server handles incremental updates automatically

4. **Drop mcp-local-rag:**
   - Its only advantage (better doc search) is already covered by the skill system
   - The workaround for TS files is fragile
   - No incremental indexing is a dealbreaker for daily use
   - Remove from opencode.json, delete lancedb/

---

## Action Items
- [x] Add codesearch MCP to opencode.json  
- [x] Add `.codesearch.db/` to .gitignore
- [x] Remove mcp-local-rag from opencode.json
- [x] Delete lancedb/ directory
- [x] Update AGENTS.md with codesearch usage guidance
- [x] Test codesearch MCP mode in a real session

---

## Real Benchmark Results (post-implementation)

Final index: **62,266 chunks across 1,465 files** (minilm-l6-q, 384 dimensions)

### 10-Query Benchmark: Codesearch vs Grep vs Explore Agent

| # | Query | Codesearch | Grep | Explore |
|---|-------|-----------|------|---------|
| 1 | GameDefinition interface | ❌ Found secondary types, missed primary | ✅ Found in 1 call | N/A |
| 2 | Metro port config | ✅ metro.config.js, withMetroPort.js | ✅ Same | N/A |
| 3 | tRPC routers | ⚠️ Found 1 router, missed 20 | ✅ All 21 routers | N/A |
| 4 | Economy/wallet | ⚠️ Found gem-service, missed wallet-service | ⚠️ 310 noisy matches | ✅ Full architecture |
| 5 | Godot bridge dispatch | ✅ BridgeCore.ts, codegen, native bridge | ⚠️ Scattered | ✅ Full flow |
| 6 | Entity components | ✅ Prefab.ts, EntityManager (ECS) | ❌ React components | ✅ ECS types |
| 7 | AI game generation | ⚠️ generator, executor, prompt-builder | ❌ Impossible | ✅ Full pipeline |
| 8 | Input handling | ⚠️ useInputHandlers, overlays | ❌ Impossible | ✅ Full round-trip |
| 9 | Database migrations | ❌ Wrong domain (score 0.69) | ⚠️ Files only | ✅ Full system |
| 10 | Shader effects | ⚠️ Docs only, missed implementation | ❌ Impossible | ✅ Full pipeline |

### Scorecard

| Difficulty | Codesearch | Grep | Explore Agent |
|------------|-----------|------|---------------|
| Easy (exact symbols) | 1/3 | **3/3** | N/A |
| Medium (architecture) | **2/3** | 0/3 | 3/3 |
| Hard (cross-layer) | 0/4 | 0/4 | **4/4** |

### Final Decision
- **Kept**: codesearch (semantic search for medium-difficulty queries, domain disambiguation)
- **Dropped**: mcp-local-rag (redundant — skill system covers docs, codesearch covers code)
- **Dropped**: tsg_indexer (too early, 2 commits), coderlm (not MCP-native)
- **Guidance**: Added search tool selection table to AGENTS.md
