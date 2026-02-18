# Repository Cleanup & Documentation Consolidation Plan

**Created:** Feb 16, 2026
**Status:** Draft — awaiting review before implementation

---

## Executive Summary

A full audit of the monorepo identified **4 categories of cleanup** across ~80 individual items:

1. **Root clutter** — landing pages, empty dirs, misplaced files at repo root
2. **Documentation mess** — `docs/` has 46 entries, 30+ subdirectories (many with 1 file), duplicate topics, broken index, content superseded by `.claude/skills/`
3. **Stale artifacts** — empty dirs, old data clones, worktrees
4. **Structural debt** — app route organization, config file placement

---

## Phase 1: Quick Wins (safe, no structural changes)

### P1.1 — Delete empty/stale directories
| Path | Action | Why |
|------|--------|-----|
| `temp/` | delete | Empty, gitignored |
| `tmp/` | delete | Empty, gitignored |
| `playwright-report/` | delete | Test artifact, gitignored |
| `test-results/` | delete | Test artifact, gitignored |
| `docs/plans/` | delete | Empty — plans moved to `.sisyphus/plans/` |

### P1.2 — Delete corrupted duplicate AGENTS.md
- **Delete:** `app/AGENTS.md` (382 lines of badly corrupted text)
- **Why:** Root `/AGENTS.md` is the authoritative, comprehensive source
- **Verify:** grep codebase for references to `app/AGENTS.md`, update any links

### P1.3 — Fix root README broken references
- `README.md` links to `docs/shared/reference/sound-generation.md` — file doesn't exist
- `README.md` links to `app/AGENTS.md` — replace with root `AGENTS.md`

### P1.4 — Fix stale knip config
- `knip.json` references `"games": {}` workspace — doesn't exist in `pnpm-workspace.yaml`
- **Action:** Remove the stale entry

### P1.5 — Delete stale data clones
- `data/external/` contains 4 cloned repos (theographic, BibleQuizzle, OpenTriviaQA, bible-trivia-alpaca)
- Per `data/README.md`: "All source data has been ingested...and the original cloned repos have been deleted"
- **But they're still there.** Delete them. Keep `data/README.md` for provenance.
- **Verify:** Content pipeline adapters can re-ingest from GitHub URLs if ever needed

---

## Phase 2: Documentation Consolidation

### P2.1 — Move Amen marketing docs to `docs/amen/`
Currently scattered at `docs/` root:
| Move from | To |
|-----------|-----|
| `docs/church-starter-kit.md` | `docs/amen/` |
| `docs/press-kit-amen.md` | `docs/amen/` |
| `docs/store-listing-amen.md` | `docs/amen/` |
| `docs/influencer-targets.md` | `docs/amen/` |
| `docs/human-todo-amen-launch.md` | `docs/amen/` |

### P2.2 — Consolidate duplicate topic directories

**Effects** (3 dirs → 1):
| Dir | Files | Action |
|-----|-------|--------|
| `docs/effects/` (3 files) | Keep as canonical |  |
| `docs/special-effects/` (1 file: `EFFECTS_PLAN.md`) | Move to `docs/effects/`, delete dir |
| `docs/vfx/` (1 file: `SPRITE_SHADER_DEBUG_PLAN.md`) | Move to `docs/effects/`, delete dir |

**Operations** (2 dirs → 1):
| Dir | Files | Action |
|-----|-------|--------|
| `docs/operations/` (2 files) | Keep as canonical |
| `docs/ops/` (3 files) | Merge into `docs/operations/`, delete dir |

**Godot** (2 dirs + 1 loose file → 1):
| Dir | Files | Action |
|-----|-------|--------|
| `docs/godot/` (7 files) | Keep as canonical |
| `docs/godot-migration/` (1 file) | Move to `docs/godot/`, delete dir |
| `docs/godot-rapier-wasm-build-guide.md` | Move to `docs/godot/` |

### P2.3 — Archive single-file directories and stale one-off docs

Move to `docs/archive/`:
| Path | Content |
|------|---------|
| `docs/analysis/generic-ball-sort-feasibility.md` | One-off feasibility study |
| `docs/debugging/native-jsi-method-access-issue.md` | Specific debug session |
| `docs/experiments/3D_GLB_RENDERING.md` | Experiment notes |
| `docs/reports/font-rendering-support-audit.md` | One-time report |
| `docs/research/headless-image-compositing-options.md` | Research spike |
| `docs/requests/devmux-llm-features.md` | Feature request |
| `docs/wip/unsafe-eval-engine.md` | WIP doc |
| `docs/context-analysis-baseline.md` | One-time baseline from Feb 2026 |
| `docs/user-skills-audit.md` | One-time audit from Feb 2026 |
| `docs/wireframe-process.md` | Process doc for `wireframes/` |
| `docs/text-effects-implementation.md` | Implementation summary |
| `docs/production-readiness-report.md` | One-time report |
| `docs/content-pipeline-roadmap.md` | Roadmap (likely stale) |
| `docs/AUDIT.md` | Feb 2026 codebase audit |

**Keep as-is** (still active/valuable):
| Path | Why |
|------|-----|
| `docs/decisions/` | ADRs are permanent records |
| `docs/product/` | Active product strategy docs |
| `docs/VISION.md` | Core product vision |
| `docs/economy/` | Dense reference, 9 files |
| `docs/shared/` | Active reference guides |
| `docs/rollout/` | Active ops docs |
| `docs/game-maker/` | Active architecture docs |
| `docs/graph-editor/` | Active feature docs |
| `docs/game-inspector/` | Active (has screenshots + plans) |
| `docs/architecture/` | Active architecture docs |
| `docs/testing/` | Active test docs |

### P2.4 — Rewrite `docs/INDEX.md`
Current state: severely degraded, truncated text, broken links.
**Action:** Full rewrite with clean navigation to:
- Product & Vision (`docs/product/`, `docs/VISION.md`)
- Technical Reference (`docs/economy/`, `docs/shared/`, `docs/architecture/`)
- Amen brand (`docs/amen/`)
- Operations (`docs/operations/`, `docs/rollout/`)
- Active features (`docs/game-maker/`, `docs/graph-editor/`, `docs/effects/`, `docs/godot/`)
- Archive (`docs/archive/`)
- Skills (`.claude/skills/INDEX.md`)

---

## Phase 3: Root Structure Cleanup

### P3.1 — Move landing pages under `apps/`
```
landing-amen/     → apps/landing-amen/
landing-slopcade/ → apps/landing-slopcade/
```
**Files to update:**
- `pnpm-workspace.yaml` — change paths
- `knip.json` — update workspace entry
- `package.json` scripts — any that reference landing dirs
- `.gitignore` — update `landing/.dev.vars` pattern
- Any docs/README links

**Verify:** `pnpm install`, landing builds still work

### P3.2 — Move `wireframes/` to `docs/`
- `wireframes/` contains static HTML/CSS design mockups
- **Move to:** `docs/wireframes/` (design reference alongside other docs)
- Or archive to `docs/archive/wireframes/` if no longer actively used

### P3.3 — Relocate misplaced root files
| File | Action | Destination |
|------|--------|-------------|
| `types/glsl.d.ts` | Move | `app/types/glsl.d.ts` or `shared/src/types/` |
| `nativewind-env.d.ts` | Move | `app/nativewind-env.d.ts` |
| `tailwind.config.js` | Audit | May need to stay at root if NativeWind requires it |

### P3.4 — Audit root `app.json` and `eas.json`
- Root `app.json` has bundle ID `com.hassoncs.slopcade-monorepo` (different from `app/app.json`)
- Root `eas.json` has build profiles
- **RISK:** These may be used by EAS CLI when run from repo root
- **Action:** Verify whether EAS is ever invoked from root (check CI, scripts). If only from `app/`, delete root copies.

---

## Phase 4: Structural Improvements (Higher risk)

### P4.1 — Reorganize Expo Router routes
Move internal/dev routes out of the production route tree:
- `app/app/examples/` → `app/app/(dev)/examples/`
- `app/app/godot-test.tsx` → `app/app/(dev)/godot-test.tsx`
- `app/app/image-search.tsx` → `app/app/(dev)/image-search.tsx`

Consider marketing route group:
- `app/app/landing.tsx` → `app/app/(marketing)/landing.tsx`
- Update redirect in `app/app/index.tsx`

**Risk:** Expo Router URL changes. Verify deep links, tab navigation.

### P4.2 — Prune stale git worktrees
`.worktrees/` has 11+ entries. These are already gitignored.
**Action:** Run `git worktree list`, identify stale ones, `git worktree remove`.

### P4.3 — Address `crux/` Python project
`crux/` is a standalone Python LLMLingua prompt compression tool.
**Options:**
1. Move to its own repo (cleanest)
2. Move to `tools/crux/` to signal "not a workspace package"
3. Leave as-is (it's already gitignored from most tooling)

### P4.4 — Clean up .sisyphus/plans/
Per AGENTS.md: "Completed plans: Delete immediately after implementation."
**Action:** Audit all 18 plans + 37 party game plans. Delete completed ones.

---

## Execution Order

```
Bundle A (parallel, immediate):  P1.1, P1.2, P1.3, P1.4, P1.5
Bundle B (parallel, after A):    P2.1, P2.2, P2.3 (then P2.4 last)
Bundle C (sequential):           P3.1 (then P3.2, P3.3, P3.4)
Bundle D (sequential, careful):  P4.1, P4.2, P4.3, P4.4
```

## Verification After Each Phase
- `pnpm install` (workspace resolution still works)
- `pnpm build` (nothing broken by moves)
- `pnpm test` (no test regressions)
- `tsc --noEmit` (type resolution intact)
- `pnpm knip` (no new unused deps/exports)
