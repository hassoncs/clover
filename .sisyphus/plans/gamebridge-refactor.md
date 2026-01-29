# GameBridge.gd Refactor Plan (Godot 4 Autoload)

## TL;DR

Refactor `godot_project/scripts/GameBridge.gd` safely by:
1) **Fixing the `visual.type: "image"` no-physics/no-collider bug** (highest priority) with tight repro + inspector-based verification.
2) **Deleting confirmed-dead old sprite system functions**.
3) **Incrementally extracting modules** behind a stable `GameBridge` façade so all JS-exposed APIs remain intact.

**Estimated effort**: Medium–Large (safe refactor, many moving parts)
**Parallel execution**: YES (some exploration/verification tasks can run in parallel)
**Critical path**: Bug repro instrumentation → bug fix → verify → delete dead code → verify → module extraction (incremental) → verify

---

## Context

### Original Request
Refactor a ~4433-line autoload singleton `GameBridge.gd` into maintainable modules, delete dead sprite code, and fix a bug where image-only entities render as `Polygon2D` instead of `Sprite2D`.

### Key Repro (confirmed)

Template (in `templates` JSON):
```json
{
  "id": "ball0",
  "tags": ["ball", "color-0"],
  "visual": {
    "type": "image",
    "imageUrl": "https://.../ball0.png",
    "width": 1.1,
    "height": 1.1
  }
}
```

Entity instance:
```json
{
  "id": "ball-0",
  "template": "ball0",
  "transform": { "x": -5.48, "y": -5.42, "angle": 0, "scaleX": 1, "scaleY": 1 }
}
```

**Expected**: entity node has a `Sprite2D` child.
**Actual**: entity node has a `Polygon2D` child (white rectangle).

Control case (same template + physics/collider added) produces correct `Sprite2D` child.

### Relevant code observations (current)
- `load_game_json()`:
  - sets `templates = game_data.get("templates", {})`
  - prints template `visual.type` if present
  - iterates `entities_data` and calls `_create_entity(entity_data)`.
- `_create_entity(entity_data)`:
  - merges template into entity dictionary
  - pulls `visual_data = merged.get("visual", null)`
  - if `visual_data`, calls `_resolve_visual_with_defaults(visual_data, collider_data)` (does NOT mutate `type`)
  - calls `_add_visual(node, resolved_visual)`.
- `_add_visual()`:
  - `visual_type = visual_data.get("type", "rect")`
  - `match visual_type`: for `"image"` calls `_add_image_visual()` which creates a `Sprite2D`.

---

## Work Objectives

### Core Objective
Make image-only entities render correctly (always `Sprite2D` for `visual.type == "image"`), then reduce risk/complexity by removing dead code and modularizing without breaking the JS bridge.

### Must Have
- Bug fixed: image-only entities create `Sprite2D`, not `Polygon2D`.
- JS bridge compatibility preserved: **all JS-exposed names stable** (`_js_*` handlers and public methods used by JS).
- Safe refactor: small commits, frequent manual verification.

### Must NOT Have (Guardrails)
- No renaming/removing JS bridge functions or changing callback registration names.
- No large behavioral changes to physics/collisions/input unrelated to refactor.
- No “move everything at once” extraction; extraction must be incremental and verifiable.

---

## Verification Strategy (Manual QA using game-inspector)

**Infrastructure exists**: No automated tests assumed.
**QA approach**: Manual-only.

### Baseline Evidence (before any change)
Capture evidence for repro and for a control case.

1) Open a known test game in browser via game-inspector.
2) Find entity `ball-0` and inspect its children types.
3) Screenshot the scene with the incorrect white rectangle.
4) Also verify a physics+collider version of the same asset (or a known entity) produces `Sprite2D`.

**Evidence required**:
- A screenshot saved to `.sisyphus/evidence/bug-baseline.png`.
- A captured list of child node class names for `ball-0` and for the control entity saved to `.sisyphus/evidence/bug-baseline-children.txt`.

### Regression Checklist (run after each commit)
- Game loads successfully.
- JS bridge still functions (game loads, entities spawn, camera works at least minimally).
- `ball-0` now has `Sprite2D` child and no unexpected `Polygon2D` fallback.

---

## Execution Strategy (Waves)

Wave 1 (Bug fix groundwork):
- Instrumentation and root-cause tracing for `visual.type` mismatch
- Manual QA baseline capture

Wave 2 (Bug fix implementation):
- Implement minimal, robust normalization/validation so `visual:image` always routes to `_add_image_visual`
- Manual QA verification and cleanup

Wave 3 (Dead code deletion):
- Remove old sprite system functions (only those confirmed unused)
- Manual QA sanity check

Wave 4 (Modularization):
- Extract modules behind a `GameBridge` façade incrementally (one subsystem at a time)
- Manual QA after each extraction

---

## TODOs

> Notes:
> - “References” below point to **current** `GameBridge.gd` areas; the executor should update them as files are extracted.
> - Manual QA steps are written assuming use of the `game-inspector` MCP tool.

### 1) Capture baseline repro + control evidence (pre-change)

**What to do**:
- Use game-inspector to open a game that spawns `ball-0` from `ball0` template.
- Capture:
  - screenshot showing the incorrect white rectangle
  - list of `ball-0` children node classes (`Polygon2D` vs `Sprite2D`).
- Capture control case evidence for the physics+collider variant (or another known-good image entity).

**References**:
- `godot_project/scripts/GameBridge.gd:1070-1102` (`load_game_json` loads templates/entities)

**Acceptance Criteria**:
- Evidence files created:
  - `.sisyphus/evidence/bug-baseline.png`
  - `.sisyphus/evidence/bug-baseline-children.txt`

**Commit**: NO (evidence only)

---

### 2) Root-cause trace: prove why `visual_type` is not `"image"` in the failing case

**What to do**:
- Add temporary, targeted debug logging (and/or inspector-friendly metadata) to capture:
  - template `visual` dictionary for `ball0` at load time
  - merged `visual` dictionary inside `_create_entity` for `ball-0`
  - the exact `visual_type` value inside `_add_visual`
- Ensure logs include:
  - `entity_id`, `template_id`
  - `visual_data.keys()` and `visual_data.get("type")`
  - whether `visual_data` is actually a `Dictionary`.

**Why**: current code *should* keep `type: image`; we need concrete evidence of where it diverges.

**References**:
- `godot_project/scripts/GameBridge.gd:1070-1100` template loading + debug print
- `godot_project/scripts/GameBridge.gd:1297-1362` `_create_entity` merge + `_add_visual` call
- `godot_project/scripts/GameBridge.gd:4320-4380` `_add_visual` dispatch

**Acceptance Criteria**:
- Running the repro produces logs that clearly show one of:
  - `visual_data` is missing `type`, OR
  - `visual_data` is not a Dictionary / is malformed, OR
  - `_add_visual` receives unexpected `visual_type`.
- Log excerpt saved to `.sisyphus/evidence/bug-trace.txt`.

**Commit**: YES (temporary instrumentation)
- Message: `chore(godot): add trace logs for image-only visual bug`

---

### 3) Implement minimal, robust bug fix: ensure image-only visuals always create Sprite2D

**Approach constraint**: keep fix **surgical** (safe refactor). Do not refactor modules yet.

**What to do** (choose the smallest correct option based on Task 2 trace):

Option A (preferred if `type` is missing):
- Add a normalization/validation step before `_add_visual`:
  - If `visual_data` exists and `visual_data.get("type", "")` is empty/missing:
    - infer `type` from presence of keys:
      - if `imageUrl` or `url` exists → `type = "image"`
      - else if `text` exists → `type = "text"`
      - else if `vertices` exists → `type = "polygon"`
      - else if `radius` exists → `type = "circle"`
      - else default to `rect`

Option B (if merge is dropping/overwriting the template visual):
- Fix template merge so `merged["visual"]` becomes a deep duplicate of template visual (and cannot be mutated unexpectedly).

Option C (if `_add_visual` is not being reached or is bypassed):
- Fix the bypass and add a guard assertion/log if `_create_entity` has `visual_data` but does not call `_add_visual`.

**References**:
- `godot_project/scripts/GameBridge.gd:1297-1362` visual add flow
- `godot_project/scripts/GameBridge.gd:4231-4263` `_resolve_visual_with_defaults` (does not touch type)
- `godot_project/scripts/GameBridge.gd:4320-4440` `_add_visual` + `_add_image_visual`

**Acceptance Criteria**:
- Repro entity `ball-0`:
  - child list contains `Sprite2D`
  - does **not** contain a `Polygon2D` created as a fallback “rect visual”
- Screenshot saved to `.sisyphus/evidence/bug-fixed.png`.
- Child list saved to `.sisyphus/evidence/bug-fixed-children.txt`.

**Commit**: YES
- Message: `fix(godot): render image-only entities with Sprite2D`

---

### 4) Remove temporary logging / convert to low-noise diagnostics

**What to do**:
- Remove or gate the temporary logs from Task 2.
- Keep (optional) a single warning when `visual` is malformed (e.g., missing type and cannot infer) to help future debugging.

**Acceptance Criteria**:
- Repro still passes.
- No excessive console spam during normal gameplay.

**Commit**: YES
- Message: `chore(godot): remove image-visual debug tracing`

---

### 5) Delete dead code: old sprite system entrypoints (ONLY confirmed unused)

**What to delete first** (targeted removal):
- Delete the following functions:
  - `_add_sprite(node, sprite_data, physics_data, zone_data=null)`
  - `_add_image_sprite(node, sprite_data, opacity, z_index_val)`
  - `_add_text_sprite(node, sprite_data, opacity, z_index_val)`

**What NOT to delete yet**:
- Helpers that appear used elsewhere (verify before deletion):
  - `_apply_sprite_scale` (used by `set_entity_image`, atlas helpers)
  - `_queue_texture_download`, `_download_atlas_texture`, `_apply_atlas_region`, etc.
  - debug visibility helpers if still used (`_apply_debug_visibility` etc.)

**References**:
- Old sprite system region around `godot_project/scripts/GameBridge.gd:1620-1782`
- Confirm `_add_sprite` is not called anywhere (search for `_add_sprite(` should only match its definition).

**Acceptance Criteria**:
- Project runs and game loads.
- Bug fix remains intact (`ball-0` still renders as `Sprite2D`).

**Commit**: YES
- Message: `refactor(godot): remove dead legacy sprite system`

---

### 6) Modularize safely (incremental extraction behind GameBridge façade)

**High-level design**:
- Keep `GameBridge.gd` as the **autoload façade** (stable API surface).
- Extract subsystems into separate scripts under `godot_project/scripts/gamebridge/`.
- Modules should be either:
  - `class_name` + `extends RefCounted` “service objects” instantiated by `GameBridge` (recommended), OR
  - child `Node`s added under the autoload (acceptable if lifecycle hooks needed).
- Modules receive a reference to the bridge/state via constructor/init to avoid global coupling.

**Suggested file structure** (one plan; extraction can be done in any safe order):
```
godot_project/scripts/
  GameBridge.gd                      # façade autoload (thin)
  gamebridge/
    GB_Coords.gd                     # game↔godot conversions
    GB_Entities.gd                   # _create_entity + templates merge + entity registry helpers
    GB_Visuals.gd                    # _add_visual/_add_image_visual/_add_text_visual + visual normalization
    GB_Textures.gd                   # _download_image_texture + cache + preload
    GB_PhysicsBodies.gd              # _create_physics_body/_create_sensor_entity/_create_collider_shape
    GB_PhysicsAPI.gd                 # legacy PhysicsServer2D low-level API wrappers
    GB_Input.gd                      # send_input + _notify_js_input_event
    GB_Collisions.gd                 # collision handlers + JS notifications
    GB_Camera.gd                     # camera setup/controls
    GB_Background.gd                 # background/parallax
    GB_UI.gd                         # UI components
    GB_Viewport3D.gd                 # 3D viewport/glb
    GB_Debug.gd                      # screenshots/overlays + debug visibility toggle
    GB_JSBridge.gd                   # callback registration + _js_* handlers (optional split)
```

**Extraction order (safe)**:
1) Extract pure helpers first (`GB_Coords`), then visuals/textures, then entity creation, then everything else.
2) After each extraction: run the manual QA regression checklist.

**Acceptance Criteria (per extraction)**:
- No change to JS-visible behavior.
- Game loads; `ball-0` renders as `Sprite2D`.
- A minimal “smoke test” sequence succeeds (spawn entity, destroy entity, set camera).

**Commit strategy**:
- One subsystem per commit.
- Conventional messages, e.g.:
  - `refactor(godot): extract visuals module`
  - `refactor(godot): extract entity factory module`

---

## Success Criteria (End State)

- `ball-0` (no physics/collider, visual:image from template) renders with `Sprite2D`.
- Old sprite system entrypoints removed.
- `GameBridge.gd` reduced to a stable façade delegating to modules.
- Manual QA evidence captured for baseline and post-fix.
