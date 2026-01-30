# Decisions — game-bundle-systematic-plan

## 2026-01-29 — QuickJS package selection (cross-platform scripting)

### Decision
Use **`quickjs-emscripten`** as the primary embedded scripting engine for Slopcade bundles.

### Why this choice
- **Cross-platform**: WebAssembly build works in **browsers** and **Node.js** (and also Deno/Bun/Cloudflare Workers per upstream docs). This directly satisfies “web games” + “Node.js CI”.
- **Budget controls**: Supports **interrupt handlers** and a convenience `shouldInterruptAfterDeadline(...)` helper; also supports **memory limits** on the runtime.
- **API quality**: TypeScript-first API with explicit `Runtime`/`Context`, module loader hooks, and strong guidance around host API exposure. Memory/handle management is explicit and enforced.
- **Maintenance**: Active repo (~600 commits), widely used (stars in the 1k+ range), recent releases (e.g. `0.31.0` on 2024-09-07).
- **Bundle size is manageable and tunable**: Base package is a few MB unpacked; upstream provides multiple **variants** (e.g. separate `.wasm` file vs “singlefile”, `quickjs` vs `quickjs-ng`, `sync` vs `asyncify`) to optimize for web/mobile.

### Recommendation for our usage
- Start with **`quickjs-emscripten`** (core API). Prefer a **“wasmfile-release-sync”** variant (separate `.wasm`) for smaller JS wrapper + better caching, unless our bundler constraints require a single-file build.
- Enforce budgets by combining:
  - `runtime.setInterruptHandler(...)` or `QuickJS.evalCode(..., { shouldInterrupt })`
  - `runtime.setMemoryLimit(...)` / `memoryLimitBytes` options
  - (Optional) a wall-clock deadline for host cancellation.

### Known caveat (important for “budget enforcement”)
Interrupt handlers are not a perfect “instruction counter” and may have edge cases where certain operations delay interrupt checks (e.g. reported upstream in quickjs-emscripten issues). Treat this as a **best-effort** safety valve and pair with **memory limits** and higher-level timeouts.

### React Native stance
- **Baseline plan**: attempt to run the WASM-based `quickjs-emscripten` in RN (if Hermes/JS runtime supports WebAssembly sufficiently in our target RN/Expo versions).
- **Fallback**: if RN WebAssembly support is insufficient, consider **`react-native-quickjs`** as an RN-only backend (native QuickJS executor via RN integration). This would be a **separate engine path** from the web/node WASM path.

### Candidates considered

#### 1) `quickjs-emscripten` (selected)
- Pros:
  - Browser + Node-friendly WASM runtime
  - Memory limits + interrupt handler support
  - Mature, documented, multiple build variants
- Cons:
  - Manual handle disposal model (needs strict patterns)
  - Interrupt handler isn’t a deterministic instruction counter
  - RN support depends on RN WebAssembly availability (not guaranteed)

#### 2) `@sebastianwessel/quickjs`
- What it is: a higher-level sandbox built on top of `quickjs-emscripten` (adds Node-ish modules, virtual FS, fetch injection, test runner).
- Pros:
  - More batteries-included sandbox conveniences
  - Actively maintained and documented
- Cons:
  - More surface area than we need for “game script” evaluation
  - Likely larger bundle/complexity; higher risk of exposing unwanted host capabilities
  - Still inherits the underlying WASM/RN constraints

#### 3) `quickjs-emscripten-sync`
- What it is: not an engine; a marshalling/sync layer for host<->guest objects on top of `quickjs-emscripten`.
- Pros:
  - Great DX when you truly need rich object graphs + proxy-based syncing
- Cons:
  - Larger attack surface; security warnings are prominent
  - Not needed for “pass data in, return value out” bundles (we can do explicit JSON/value bridging)

#### 4) `react-native-quickjs`
- Pros:
  - Purpose-built for RN (native integration), avoids depending on RN WebAssembly support
- Cons:
  - Not a single cross-platform solution (doesn’t help web)
  - Appears less maintained (npm `0.0.2`, minimal repo activity), higher integration/maintenance risk

#### 5) `@cf-wasm/quickjs`
- Pros:
  - “QuickJS” package in a WASM-focused monorepo; recent publish
- Cons:
  - **Very large** unpacked size (~45MB on npm metadata), likely unsuitable for mobile bundles

#### 6) `quickjs-wasm`
- Pros:
  - Small on npm metadata
- Cons:
  - Extremely new (`0.0.1`), unclear API/maintenance; not enough evidence to pick over `quickjs-emscripten`

#### 7) `quickjs` (npm)
- Not a QuickJS engine; unrelated “front-end structure solution”. Rejected.

### Notes on tooling constraints
- Context7 did not surface a JS `quickjs-emscripten` library entry in this environment; primary documentation was taken from upstream GitHub/README and npm metadata.
