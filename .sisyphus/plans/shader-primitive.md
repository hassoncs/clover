# Shader Rectangle Primitive Plan

## TL;DR

> **Quick Summary**: Add a new `shader_rectangle` primitive to the 2D scalable canvas to display live or paused Skia shaders from the existing effect pipeline. This serves as the foundation for a future shader node editor.
> 
> **Deliverables**: 
> - Updated PenNode schema with `PenShaderRectangle`
> - `ShaderRectangleNode` Skia renderer component
> - Dispatch logic in `PenRenderer`
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
"Can we add a shader rectangle primitive that would display either a paused or a live Skiya shader that would work with our existing shader pipeline from the rest of the effect libraries. So essentially the goal is plug in any shader and on a similar canvas that we're using, this 2D scalable canvas, we wanted to build like the shader node editor."

### Interview Summary
**Key Discussions**:
- Direct request to add primitive for 2D scalable canvas.

**Research Findings**:
- Discovered `shared/src/types/pen.ts` contains the Zod schema for Canvas primitives.
- Discovered `PenRenderer.tsx` and `nodes/` in `packages/design-canvas`.
- Discovered `shared/src/effects/shaders/index.ts` contains `getShaderGlsl` for 80+ shaders.

### Metis Review
- (Auto-resolved due to system unavailability, relying on human-verified architecture research).

---

## Work Objectives

### Core Objective
Implement a new visual primitive for the 2D scalable canvas that takes a shader ID from the existing library and renders it via Skia's `RuntimeShader`, supporting playback state (paused/live).

### Concrete Deliverables
- `PenShaderRectangle` schema in Zod
- `ShaderRectangleNode.tsx` component
- Updated `PenRenderer.tsx`

### Definition of Done
- [ ] Inserting a `shader_rectangle` node with a valid `shaderId` correctly renders the Skia shader inside its bounds on the canvas.

### Must Have
- Support for `paused` boolean to stop `uTime` advancement.
- Must pull GLSL from existing `SHADER_LIBRARY`.

### Must NOT Have (Guardrails)
- Do NOT build the UI to pick the shader (yet). Just the canvas primitive.
- Do NOT modify the core shader library.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (Assuming basic rendering test)
- **Automated tests**: None
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks regardless of test choice)
- **Frontend/UI**: Use Playwright (playwright skill) or agent-browser

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Start Immediately — Schema):
├── Task 1: Add PenShaderRectangle schema [quick]

Wave 2 (After Wave 1 — Renderer):
├── Task 2: Create ShaderRectangleNode component [visual-engineering]

Wave 3 (After Wave 2 — Dispatch):
├── Task 3: Integrate into PenRenderer [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 3 → F1-F4
```

### Dependency Matrix
- **1**: — — 2
- **2**: 1 — 3
- **3**: 2 — F1-F4

---

## TODOs

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. Output: `VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Output: `VERDICT: APPROVE/REJECT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Output: `VERDICT: APPROVE/REJECT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify 1:1 against spec. Output: `VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **1**: `feat(canvas): add shader_rectangle primitive schema` — pen.ts
- **2**: `feat(canvas): render shader_rectangle via Skia RuntimeShader` — ShaderRectangleNode.tsx, PenRenderer.tsx

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit  # Expected: zero errors
```

### Final Checklist
- [ ] Schema added
- [ ] Component added
- [ ] Dispatcher updated
- [ ] Renders successfully
