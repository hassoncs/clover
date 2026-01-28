# Silhouette Font Stylization (Worker-safe SVG Grid → External Img2Img → Sprite-Sheet Animation)

## TL;DR

> **Quick Summary**: Add a new Worker-safe “text asset” pipeline that lays out text into a deterministic **grid of per-grapheme cells** (with multi-line wrapping), renders a **silhouette SVG** using allowlisted Google Fonts, and drives an external **img2img stylization** step that returns a single stylized atlas; the game/client can animate letters in by using the known cell geometry (no server-side slicing).
>
> **Deliverables**:
> - New “text/logo” generation spec + pipeline stage(s) alongside existing UI component generator
> - Deterministic `LayoutDoc` JSON + `SilhouetteSvg` output
> - Stylization orchestration contract (input SVG/raster, output atlas) + background removal integration
> - Runtime-friendly “atlas slicing” strategy (grid rects / optional clipPath SVG)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Spec + layout → font fetch/cache → SVG silhouette output → stylize orchestration → integration/demo

---

## Context

### Original Request
- Find the existing UI generation code (buttons/checkboxes/etc.) and extend the silhouette approach to generate **stylized fonts**.
- New idea: render text **letter-by-letter in a separated grid**, stylize the whole grid via img2img, then animate letters in/out because we know each letter’s location.
- Prefer **Google Web Fonts**.
- Must run in **Wrangler / Cloudflare Worker**, avoid Sharp/native image libs at runtime; likely **SVG-based**.

### Interview Summary (Decisions)
- **Stylization runtime**: External API (Worker orchestrates).
- **Layout scope**: Multi-line wrapping.
- **Google Fonts**: v1 allowlist.
- **Typography fidelity**: kerning ON, ligatures OFF.
- **Rasterization**: client-side (Worker returns SVG+metadata; stylizer returns raster atlas; client renders/animates).
- **Test strategy**: manual-only.

**Defaults applied (can override):**
- **Stylizer output**: single **transparent raster atlas** (PNG/WebP) at the requested grid pixel dimensions.
- **Background removal**: performed by the stylizer pipeline (preferred) OR immediately after stylization as part of the same external service.
- **Script support v1**: Latin-ish / LTR only; complex shaping (Arabic/Indic/RTL/bidi) is out-of-scope for v1.

### Codebase Findings (where UI generation lives)
- Primary pipeline lives under `api/src/ai/pipeline/**`.
- UI silhouettes/stages:
  - `api/src/ai/pipeline/silhouettes/ui-component.ts`
  - `api/src/ai/pipeline/silhouettes/ui-component-svg.ts`
  - `api/src/ai/pipeline/silhouettes/text-hint.ts`
  - `api/src/ai/pipeline/stages/ui-component.ts`
  - `api/src/ai/pipeline/stages/index.ts`
  - `api/src/ai/pipeline/prompt-builder.ts`
  - `api/src/ai/pipeline/types.ts`, `api/src/ai/pipeline/registry.ts`, `api/src/ai/pipeline/executor.ts`
- Worker + R2 plumbing:
  - `api/wrangler.toml`
  - `api/src/ai/pipeline/adapters/workers.ts` (R2 adapter; public URLs `/assets/{key}`)

### Metis Review (gaps to explicitly address)
- Define grapheme segmentation (UAX #29) and how emoji/ZWJ sequences behave.
- Define determinism scope (LayoutDoc + SVG deterministic; raster not bitwise deterministic across clients).
- Pin font identity (family+weight+exact font file URL/hash) into cache keys.
- Set hard limits (max graphemes/lines/SVG bytes/atlas pixels).
- Decide where background removal runs (external step vs client) and validate outputs.

---

## Determinism Scope (important)
- **Deterministic**: `LayoutDoc` (grid/cell geometry, IDs, wrapping) and `SilhouetteSvg` structure/IDs.
- **Not guaranteed bitwise-deterministic**: client rasterization of SVG `<text>` across browsers/OSes. If bitwise determinism is later required, plan a v2 to outline glyphs to SVG paths in Worker (opentype.js) and/or pin a single rasterizer.

---

## Work Objectives

### Core Objective
Create a Worker-safe text/logo asset generator that outputs a deterministic **silhouette SVG grid + LayoutDoc** suitable for external img2img stylization and in-game per-letter animation.

### Concrete Deliverables
- New spec type (e.g. `TextGridSpec`) and corresponding pipeline registration.
- `LayoutDoc` JSON schema (stable cell IDs, bbox per cell, wrap rules).
- `renderSilhouetteSvgGrid()` implementation using allowlisted Google Fonts.
- Font fetching/caching strategy for Workers (proxy fonts through your infra with correct headers).
- External stylizer contract (inputs/outputs validation) and background-removal integration points.
- Demonstration path: generate “BUBBLE SORT” (or similar) as a stylized atlas and animate letters in the runtime using grid metadata.

### Definition of Done
- A single request can produce:
  - `LayoutDoc` (JSON) + `SilhouetteSvg` (string)
  - a stable content hash (`layoutHash`, `silhouetteHash`, `styleHash`) used for caching and R2 keys
- Multi-line wrapping conforms to specified rules for a fixture set.
- Allowlisted Google Fonts resolve reliably (no CORS failures) and are cacheable.
- A client/game can animate letter-by-letter using the metadata without Worker-side image slicing.

### Must NOT Have (Guardrails)
- No Sharp/native image processing in Worker runtime.
- No attempt to fully implement HarfBuzz-level shaping, bidi, RTL in v1 (explicitly out-of-scope unless added).
- No “full Google Fonts catalog” runtime browsing in v1.
- No server-side raster slicing into per-letter sprites.

---

## Verification Strategy (Manual-only)

### Primary Manual QA (wrangler dev)
1. Run the API locally (whatever your existing `wrangler dev`/local dev command is for `api/`).
2. Call the new endpoints/spec runner with:
   - simple ASCII text
   - multi-line wrapping cases
   - emoji / combining marks fixtures
3. Validate output:
   - SVG renders in browser
   - LayoutDoc cell count matches grid
   - Each visible cell has stable `cellId` and correct `x,y,w,h`
4. Feed silhouette to the external stylizer (existing img2img provider).
5. Ensure stylized output atlas has correct dimensions and transparency/background removal.
6. In-game/client: render atlas and animate per-letter reveal using the grid rects.

Evidence to capture:
- Console output / HTTP responses for fixture requests
- Screenshots of rendered silhouette SVG and stylized atlas
- Short screen recording or screenshot sequence of letter-by-letter animation

---

## Execution Strategy

### Wave 1 (Foundations)
- Spec + types + registry wiring
- Deterministic `LayoutDoc` and hashing
- Wrapping algorithm + grapheme segmentation rules

### Wave 2 (Rendering + Fonts)
- Worker-safe Google Font allowlist + proxy/cache
- SVG silhouette grid renderer (font metrics, kerning, baselines)
- Output validation + limits

### Wave 3 (Stylize + Runtime Integration)
- External img2img orchestration contract + background removal expectations
- Atlas + slicing metadata integration into runtime
- Demo (logo/title) usage

---

## TODOs

> Notes:
> - References are exhaustive because executors won’t have your interview context.
> - Tests are manual-only per decision; each task includes explicit manual verification steps.

### 1) Define new text/logo asset spec + pipeline wiring

**What to do**:
- Add a new spec type (e.g. `TextGridSpec`) alongside existing pipeline specs.
- Register it in the pipeline registry and executor flow similar to UI component generation.
- Ensure artifacts can hold `LayoutDoc`, `SilhouetteSvg`, and any stylize outputs/URLs.

**References**:
- `api/src/ai/pipeline/types.ts` — existing spec/type patterns (`UIComponentSheetSpec`, artifacts)
- `api/src/ai/pipeline/registry.ts` — how asset types map to stage sequences
- `api/src/ai/pipeline/executor.ts` — how specs are executed
- `api/src/ai/pipeline/stages/ui-component.ts` — example of a multi-stage UI pipeline

**Acceptance criteria (manual)**:
- Running the pipeline with a minimal `TextGridSpec` reaches the new stages and returns a structured result.

### 2) Lock the deterministic text segmentation + LayoutDoc schema

**What to do**:
- Specify segmentation as Unicode grapheme clusters (UAX #29).
- Define how whitespace behaves (space = empty visible? empty cell?) and whether punctuation gets its own cell.
- Define `LayoutDoc` JSON:
  - `grid` (cellW/cellH/cols/maxLines/align/lineGap)
  - `cells[]` with stable `cellId` + `x,y,w,h` + `g` (grapheme)
  - hashing fields (`layoutHash`, `silhouetteHash`, `styleHash`)
- Define hard limits (max graphemes, max SVG bytes, max pixel area).

**References**:
- New file to create near: `api/src/ai/pipeline/**` (match patterns in existing spec definitions)

**Acceptance criteria (manual)**:
- For a fixture containing: `e?` (combining marks), `👩‍🚀`, `🇺🇸`, multi-spaces, and `\n`, the LayoutDoc has expected grapheme counts and stable cell indices.

### 3) Implement multi-line wrapping algorithm (grid-first)

**What to do**:
- Implement wrapping that respects explicit `\n`.
- Word-boundary wrapping where possible; fall back to hard breaks for long tokens.
- Alignment rules (left/center/right) at the grid-cell level.
- Decide overflow policy for text exceeding max lines (truncate/ellipsis/error) and encode it.

**Acceptance criteria (manual)**:
- Provide 5–10 wrap fixtures (short words, long word, punctuation) and verify line breaks match spec.

### 4) Worker-safe Google Font allowlist + fetch/proxy + caching

**What to do**:
- Define allowlist config (families + weights + style).
- Implement a font proxy endpoint (or R2-hosted font assets) so the client can load fonts without CORS surprises.
- Cache strategy:
  - Cache API for CSS/font binaries
  - Optional KV/R2 persistence for font binaries
- Ensure font identity (URL/hash) is included in cache keys.

**References**:
- `api/wrangler.toml` — bindings and compatibility flags
- `api/src/ai/pipeline/adapters/workers.ts` — R2 adapter patterns

**Acceptance criteria (manual)**:
- For an allowlisted family+weight, the Worker returns a stable URL for the font asset that loads in the browser.
- Repeated calls hit cache (verify via logs/headers if available).

### 5) Render silhouette SVG grid using allowlisted font (kerning on, ligatures off)

**What to do**:
- Implement `renderSilhouetteSvgGrid(layoutDoc, fontSpec, silhouetteSpec) → SilhouetteSvg`.
- Silhouette spec includes padding/stroke/rounding choices.
- Output SVG should have stable `<g id="cell-{i}">` groups.
- Ensure text is properly escaped (avoid SVG injection).
- Decide whether you render via `<text>` elements (client-rasterized) vs path outlines.
  - v1 likely `<text>` due to “client rasterization” decision; still must ensure metrics are “good enough”.

**References**:
- `api/src/ai/pipeline/silhouettes/text-hint.ts` — existing SVG text hint construction patterns
- `api/src/ai/pipeline/silhouettes/ui-component-svg.ts` — SVG generation conventions

**Acceptance criteria (manual)**:
- Open returned SVG in browser: it renders the correct text in a grid.
- Cell IDs match LayoutDoc indices; bounding boxes align visually.

### 6) Define external stylizer contract (img2img + background removal) and validation

**What to do**:
- Define what the Worker sends to stylizer:
  - likely the rasterized silhouette grid produced by the client (per decision), or Worker can provide just the SVG and the client posts raster
- Define what stylizer returns:
  - a single atlas PNG/WebP (transparent) sized exactly to the silhouette canvas
  - background removal step is part of stylizer pipeline or immediately post-stylize
- Validate outputs:
  - dimensions match expected
  - alpha present or mask can be applied from silhouette

**Acceptance criteria (manual)**:
- A stylized atlas is produced for a sample title; dimensions match; background is removed acceptably.

### 7) Provide runtime integration recipe (sprite-sheet animation)

**What to do**:
- Define how the game renders the single stylized atlas as per-letter pieces:
  - using per-cell UV rects (sprite-sheet) with `LayoutDoc.cells[]`
- Provide an optional generated `AnimationSvg` (single `<image>` + per-cell clipPaths) for debugging.
- Document recommended animation patterns (scatter-in, random order, sequential).

**References**:
- Existing asset loading patterns in your game codebase (executor should search during implementation)

**Acceptance criteria (manual)**:
- In a demo screen, letters animate in one-by-one (random order) while using a single atlas.

### 8) Add guardrails, limits, and error handling

**What to do**:
- Enforce max:
  - graphemes
  - cols/rows
  - SVG size in bytes
  - total pixel area (for client raster target)
- Return structured errors (400 for invalid font, 413 for too large, 422 for unsupported script if you choose to restrict).

**Acceptance criteria (manual)**:
- Oversized request returns a clear error message without Worker timeouts.

---

## Commit Strategy
- Prefer small conventional commits per Wave:
  - `feat(pipeline): add text grid asset spec`
  - `feat(fonts): add google font allowlist + proxy`
  - `feat(silhouette): render text grid svg + layout metadata`
  - `docs(fonts): document stylize + animation contract`

---

## Success Criteria
- A user can generate a title/logo text atlas via:
  1) deterministic grid layout + silhouette SVG
  2) external img2img stylization
  3) in-game per-letter animation from a single atlas using metadata
- Worker remains free of native image dependencies.
