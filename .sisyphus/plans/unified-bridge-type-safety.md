# Unified Bridge Type-Safety & Automated Testing

## TL;DR

> **Quick Summary**: Make the Godot ↔ TypeScript bridge provably correct across web and native, with a single `pnpm test:bridge` command that catches any drift between the TypeScript interface, the web implementation, the native implementation, and the running Godot engine.
>
> **Deliverables**:
> - Codegen script that extracts a machine-readable registry from the existing `GodotBridge` interface
> - Generated GDScript validator that checks Godot's `_method_map` at startup
> - Parity test that boots headless Godot and verifies TS ↔ GDScript alignment
> - CI integration so drift can never survive a PR
>
> **Estimated Effort**: Medium (4-6 focused hours across 5 tasks)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 5

---

## Context

### What We Already Have (DO NOT DUPLICATE)

This project has substantial existing infrastructure. The plan builds ON TOP of it, not beside it.

| Component | File(s) | What It Does | Status |
|-----------|---------|-------------|--------|
| **TS Interface** | `app/lib/godot/types.ts` (496 lines) | `GodotBridge` interface — the contract | ✅ Complete, ~80 methods |
| **Web Bridge** | `app/lib/godot/GodotBridge.web.ts` (1380 lines) | Web implementation via WASM/postMessage | ✅ Working |
| **Native Bridge** | `app/lib/godot/GodotBridge.native.ts` (1148 lines) | Native implementation via JSI worklets | ✅ Working |
| **GDScript Bridge** | `godot_project/scripts/GameBridge.gd` (693 lines) | `_method_map` + `native_dispatch()` + `_setup_js_bridge()` | ✅ Working |
| **Auto-Registration** | `GameBridge._auto_register_bridge_methods()` | Scans modules for `_js_*` methods, builds `_method_map` | ✅ Working |
| **Headless Driver** | `tests/e2e/bridge/GodotHeadlessDriver.ts` (403 lines) | Spawns Godot headless, TCP connection, NDJSON protocol | ✅ Working |
| **Headless Adapter** | `godot_project/scripts/testing/HeadlessTestAdapter.gd` (252 lines) | TCP server in Godot, routes JSON-RPC to `GameBridge` | ✅ Working |
| **Typed Client** | `tests/e2e/bridge/TypedBridgeClient.ts` (734 lines) | Typed wrapper for ~92 bridge methods | ✅ Working |
| **Contract Tests** | `tests/e2e/bridge/bridge-contract.test.ts` (652 lines) | 89 smoke tests covering lifecycle, entities, physics, joints, etc. | ✅ Working |
| **Effects Type Check** | `app/lib/godot/__tests__/effects-bridge.test.ts` | `expectTypeOf<WebBridge>().toExtend<EffectsBridge>()` | ✅ Working |
| **Godot Introspection** | `GameBridge.get_bridge_methods()` | Returns `{ methods: [...], byModule: {...}, total: N }` at runtime | ✅ Working |
| **Godot LSP** | `scripts/godot-lsp-stdio.sh` | Bridges OpenCode's stdio LSP to Godot's TCP LSP | ✅ Working |

### What's Missing (THIS PLAN FILLS THE GAPS)

| Gap | Problem | Impact |
|-----|---------|--------|
| **No web/native parity enforcement** | `.web.ts` and `.native.ts` can diverge silently | Methods work on web but crash on native (or vice versa) |
| **No TS ↔ GDScript automated alignment** | Adding a method to `types.ts` doesn't guarantee GDScript has it | Runtime `unknown_method` errors in production |
| **TypedBridgeClient is manually maintained** | 734 lines of hand-written wrappers that can drift from `types.ts` | Tests pass but real bridge is broken |
| **No CI gate** | All verification is manual | Drift merges to main |

### The Divergence Problem (Concrete Example)

Today, if you add `setOrbitControls(enabled: boolean)` to `types.ts`:
1. `GodotBridge.web.ts` — you might forget to add it → **compile error** (good, TS catches it because it declares `const bridge: GodotBridge`)
2. `GodotBridge.native.ts` — you might forget → **compile error** (same reason, good)
3. `GameBridge.gd` — you might forget the GDScript handler → **NO ERROR until runtime** (bad)
4. `TypedBridgeClient.ts` — you might forget → **tests don't cover it** (bad)
5. The native impl might call `callGameBridge('set_orbit_controls', enabled)` but web calls `getGodotBridge()?.setOrbitControls(enabled)` — different calling conventions, **no way to detect mismatch**

---

## Work Objectives

### Core Objective
Create an automated pipeline where adding/changing a bridge method in `types.ts` produces **compile-time or test-time errors** if any of the 4 layers (TS interface → web impl → native impl → GDScript handler) are out of sync.

### Concrete Deliverables
1. `scripts/bridge-codegen.ts` — Parses `GodotBridge` interface, outputs registry JSON
2. `app/lib/godot/generated/bridge-registry.json` — Machine-readable method list
3. `godot_project/scripts/bridge/generated/BridgeValidation.gd` — Runtime validator
4. `tests/e2e/bridge/bridge-parity.test.ts` — E2E parity test
5. `package.json` updates — `generate:bridge`, `check:bridge`, `test:bridge` scripts

### Definition of Done
- [ ] `pnpm generate:bridge` produces `bridge-registry.json` from `types.ts`
- [ ] `pnpm check:bridge` fails if registry is stale (CI gate)
- [ ] `pnpm test:bridge` boots headless Godot, compares TS registry vs running GDScript methods
- [ ] Adding a method to `types.ts` without GDScript handler causes test failure
- [ ] Removing a GDScript handler without updating `types.ts` causes test failure

### Must Have
- Single source of truth: `app/lib/godot/types.ts`
- Zero new schema files (no JSON Schema, no DSL — TS IS the schema)
- Works with existing `GodotHeadlessDriver` infrastructure
- CI-runnable (no GUI, no browser)

### Must NOT Have (Guardrails)
- No manual registry files to maintain
- No changes to the existing `GodotBridge` interface signatures
- No breaking changes to web or native bridge implementations
- No new dependencies beyond `ts-morph` (already available in ecosystem)
- No generated code that replaces hand-written bridge logic (Phase 4 from earlier plan is DEFERRED)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES — vitest + headless Godot driver
- **Automated tests**: YES (tests-after, not TDD — we're adding validation tests to existing infra)
- **Framework**: vitest (existing `tests/e2e/bridge/vitest.config.ts`)

### Agent-Executed QA Scenarios

All verification is automated. Zero human steps.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent):
├── Task 1: Bridge Registry Codegen (no dependencies)
└── Task 2: LSP Validation of all .gd files (no dependencies)

Wave 2 (After Wave 1):
├── Task 3: GDScript Runtime Validator (depends: Task 1 output)
└── Task 4: E2E Parity Test (depends: Task 1 output)

Wave 3 (After Wave 2):
└── Task 5: CI Integration + Scripts (depends: Tasks 1-4)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | None | 1 |
| 3 | 1 | 5 | 4 |
| 4 | 1 | 5 | 3 |
| 5 | 1, 3, 4 | None | None (final) |

---

## TODOs

### Task 1: Bridge Registry Codegen

- [ ] 1. Create `scripts/bridge-codegen.ts` — Extract method registry from `GodotBridge` interface

  **What to do**:
  - Use `ts-morph` (or the TS Compiler API directly) to parse `app/lib/godot/types.ts`
  - Extract the `GodotBridge` interface (which `extends EffectsBridge`)
  - For each method, extract: name, parameter names/types, return type, whether async
  - Apply camelCase → snake_case conversion (matching `GameBridge._to_camel_case()` logic in reverse)
  - Output `app/lib/godot/generated/bridge-registry.json`:
    ```json
    {
      "generatedAt": "2026-02-10T...",
      "sourceFile": "app/lib/godot/types.ts",
      "methods": {
        "initialize": {
          "tsName": "initialize",
          "gdName": "initialize",
          "params": [],
          "returnType": "Promise<void>",
          "async": true,
          "category": "lifecycle"
        },
        "setPosition": {
          "tsName": "setPosition",
          "gdName": "set_position",
          "params": [
            { "name": "entityId", "type": "string" },
            { "name": "x", "type": "number" },
            { "name": "y", "type": "number" }
          ],
          "returnType": "void",
          "async": false,
          "category": "transform"
        }
      },
      "tsOnly": ["initialize", "dispose", "loadGame", "effectsUpdateParams"],
      "total": 80
    }
    ```
  - The `tsOnly` field lists methods that exist only in TS (lifecycle/wrapper methods with no GDScript counterpart). These are explicitly excluded from parity checks.
  - The `category` field is derived from method name patterns (same heuristic as `GameBridge._get_method_owner()`)
  - Add `pnpm generate:bridge` script to root `package.json`

  **Must NOT do**:
  - Do not parse or modify any bridge implementation files
  - Do not generate TypeScript code (this is read-only extraction)
  - Do not add runtime dependencies (ts-morph is dev-only)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: TS Compiler API / ts-morph parsing requires precise AST understanding
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Codegen output should have snapshot tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/godot/types.ts:251-479` — The `GodotBridge` interface to parse (the SOURCE)
  - `app/lib/godot/types.ts:84-95` — `EffectsBridge` interface (GodotBridge extends this)
  - `godot_project/scripts/GameBridge.gd:433-448` — `_to_camel_case()` function (the snake↔camel conversion logic to replicate in reverse)
  - `godot_project/scripts/GameBridge.gd:206-220` — `_auto_register_bridge_methods()` (shows how GDScript discovers methods)
  - `godot_project/scripts/GameBridge.gd:222-349` — `_build_method_map()` (the COMPLETE list of GDScript methods — the codegen output should be comparable to this)

  **External References**:
  - `ts-morph` docs: https://ts-morph.com/ — AST manipulation library

  **WHY Each Reference Matters**:
  - `types.ts:251-479`: This IS the input. The codegen parses this.
  - `_to_camel_case()`: The codegen must produce `gdName` that matches what Godot actually registers. This function defines the conversion rules.
  - `_build_method_map()`: This is the "ground truth" of what GDScript expects. The codegen output should be diffable against it.

  **Acceptance Criteria**:
  - [ ] `pnpm generate:bridge` runs without error
  - [ ] `app/lib/godot/generated/bridge-registry.json` is created
  - [ ] Registry contains ≥ 70 methods (current interface has ~80)
  - [ ] Each method has `tsName`, `gdName`, `params`, `returnType`, `async`
  - [ ] `tsOnly` array correctly identifies lifecycle/wrapper methods
  - [ ] Running `pnpm generate:bridge` twice produces identical output (deterministic)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Codegen produces valid registry
    Tool: Bash
    Steps:
      1. pnpm generate:bridge
      2. Assert: exit code 0
      3. Assert: file exists app/lib/godot/generated/bridge-registry.json
      4. Parse JSON, assert .methods object has > 70 keys
      5. Assert: .methods.setPosition.gdName === "set_position"
      6. Assert: .methods.setPosition.params.length === 3
      7. Assert: .methods.initialize is in .tsOnly array
    Expected Result: Registry matches interface
    Evidence: JSON output captured

  Scenario: Codegen is deterministic
    Tool: Bash
    Steps:
      1. pnpm generate:bridge
      2. cp registry.json registry1.json
      3. pnpm generate:bridge
      4. diff registry.json registry1.json
      5. Assert: no differences
    Expected Result: Identical output
    Evidence: diff output captured
  ```

  **Commit**: YES
  - Message: `feat(bridge): add codegen script to extract bridge registry from GodotBridge interface`
  - Files: `scripts/bridge-codegen.ts`, `app/lib/godot/generated/bridge-registry.json`, `package.json`

---

### Task 2: LSP Validation of All Godot Scripts

- [ ] 2. Run Godot LSP diagnostics on every `.gd` file in `godot_project/scripts/`

  **What to do**:
  - Use the working Godot LSP (via `lsp_diagnostics` tool) to check each `.gd` file
  - Collect all errors and warnings
  - Fix any **errors** (not warnings) that would prevent the bridge from functioning
  - Document remaining warnings for future cleanup
  - Focus on the bridge-related files first:
    - `GameBridge.gd`
    - `scripts/bridge/*.gd` (12 files)
    - `scripts/bridge/debug/*.gd` (7 files)
    - `scripts/testing/*.gd` (2 files)

  **Must NOT do**:
  - Do not refactor working code to fix warnings (only fix errors)
  - Do not change method signatures or behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Systematic but straightforward — run diagnostics, fix errors
  - **Skills**: [`systematic-debugging`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None (informational, no downstream dependency)
  - **Blocked By**: None

  **References**:
  - `scripts/godot-lsp-stdio.sh` — LSP bridge script (confirms LSP is available)
  - `godot_project/scripts/GameBridge.gd` — Primary bridge file to validate
  - `godot_project/scripts/bridge/` — All bridge module files

  **Acceptance Criteria**:
  - [ ] All 67 `.gd` files in `godot_project/scripts/` checked via LSP
  - [ ] Zero **errors** remaining in bridge-related files
  - [ ] Warnings documented (not necessarily fixed)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All bridge .gd files pass LSP diagnostics (no errors)
    Tool: OpenCode LSP (lsp_diagnostics tool)
    Steps:
      1. For each file in godot_project/scripts/bridge/*.gd:
         Run lsp_diagnostics with severity="error"
      2. For godot_project/scripts/GameBridge.gd:
         Run lsp_diagnostics with severity="error"
      3. Assert: zero errors across all files
    Expected Result: Clean LSP output for all bridge files
    Evidence: Diagnostic output captured per file
  ```

  **Commit**: YES (only if fixes are needed)
  - Message: `fix(godot): resolve LSP errors in bridge scripts`
  - Files: any `.gd` files that needed fixes

---

### Task 3: GDScript Runtime Validator (Generated)

- [ ] 3. Generate `BridgeValidation.gd` from registry and integrate into `GameBridge._ready()`

  **What to do**:
  - Extend `scripts/bridge-codegen.ts` to also output `godot_project/scripts/bridge/generated/BridgeValidation.gd`
  - The generated file contains:
    ```gdscript
    # AUTO-GENERATED by scripts/bridge-codegen.ts — DO NOT EDIT
    # Source: app/lib/godot/types.ts (GodotBridge interface)
    # Generated: 2026-02-10T...
    
    class_name BridgeValidation
    
    # Methods that TypeScript expects to exist in _method_map
    const EXPECTED_METHODS: Dictionary = {
      "set_position": { "param_count": 3, "async": false },
      "get_linear_velocity": { "param_count": 1, "async": true },
      # ... all methods from registry (excluding tsOnly)
    }
    
    static func validate(method_map: Dictionary) -> Array[String]:
      var errors: Array[String] = []
      
      # Check: every expected method exists in Godot
      for method_name in EXPECTED_METHODS:
        if not method_map.has(method_name):
          errors.append("MISSING: TypeScript expects '%s' but Godot does not register it" % method_name)
      
      # Check: every Godot method is known to TypeScript
      for method_name in method_map:
        if not EXPECTED_METHODS.has(method_name):
          errors.append("EXTRA: Godot registers '%s' but TypeScript does not define it" % method_name)
      
      return errors
    ```
  - In `GameBridge._ready()`, add a debug-only call:
    ```gdscript
    if OS.is_debug_build():
      var errors = BridgeValidation.validate(_method_map)
      if errors.size() > 0:
        for err in errors:
          push_error("[GameBridge][VALIDATION] " + err)
    ```
  - This means: in dev mode, if you start Godot and the bridge is out of sync, you get **immediate errors in the console**.

  **Must NOT do**:
  - Do not add validation to release builds
  - Do not crash on validation failure (just push_error)
  - Do not modify existing `_method_map` logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Templated code generation, straightforward
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `app/lib/godot/generated/bridge-registry.json` — INPUT: the registry from Task 1
  - `godot_project/scripts/GameBridge.gd:92-105` — `_ready()` function (where to add validation call)
  - `godot_project/scripts/GameBridge.gd:222-349` — `_build_method_map()` (the data being validated)
  - `godot_project/scripts/GameBridge.gd:433-448` — `_to_camel_case()` (naming convention reference)

  **Acceptance Criteria**:
  - [ ] `pnpm generate:bridge` also outputs `godot_project/scripts/bridge/generated/BridgeValidation.gd`
  - [ ] `BridgeValidation.validate()` returns empty array when bridge is in sync
  - [ ] `BridgeValidation.validate()` returns errors when methods are missing
  - [ ] `GameBridge._ready()` calls validation in debug builds
  - [ ] Generated file has `# AUTO-GENERATED` header

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Generated GDScript is valid
    Tool: OpenCode LSP (lsp_diagnostics)
    Steps:
      1. pnpm generate:bridge
      2. Run lsp_diagnostics on godot_project/scripts/bridge/generated/BridgeValidation.gd
      3. Assert: zero errors
    Expected Result: Valid GDScript
    Evidence: LSP output captured

  Scenario: Validation catches missing method
    Tool: Bash
    Steps:
      1. Manually add a fake method to bridge-registry.json: "fake_test_method"
      2. Re-generate BridgeValidation.gd
      3. Boot headless Godot, capture stdout
      4. Assert: output contains "MISSING: TypeScript expects 'fake_test_method'"
      5. Revert the fake entry
    Expected Result: Validation error reported
    Evidence: Godot stdout captured
  ```

  **Commit**: YES
  - Message: `feat(bridge): add generated GDScript validator for bridge parity`
  - Files: `scripts/bridge-codegen.ts` (updated), `godot_project/scripts/bridge/generated/BridgeValidation.gd`, `godot_project/scripts/GameBridge.gd` (add validation call)

---

### Task 4: E2E Bridge Parity Test

- [ ] 4. Create `tests/e2e/bridge/bridge-parity.test.ts` — Automated TS ↔ GDScript alignment test

  **What to do**:
  - Create a new test file that:
    1. Reads `app/lib/godot/generated/bridge-registry.json`
    2. Boots headless Godot via `GodotHeadlessDriver`
    3. Calls `bridge.getBridgeMethods()` (already exists! Returns `{ methods: [...], byModule: {...}, total: N }`)
    4. Compares the TS registry against the running Godot registry
    5. Fails if any expected method is missing from Godot
    6. Warns if Godot has methods not in the TS registry
  - Also add a **static parity check** (no Godot needed):
    - Parse `GodotBridge.web.ts` and `GodotBridge.native.ts` to verify they both implement all methods from `types.ts`
    - This is a belt-and-suspenders check on top of `tsc --noEmit` (which already catches this via `const bridge: GodotBridge = {...}`)
  - Add this to `tests/e2e/bridge/vitest.config.ts` test includes

  **Must NOT do**:
  - Do not modify existing `bridge-contract.test.ts` (it tests behavior, this tests structure)
  - Do not duplicate the 89 smoke tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward test file using existing infrastructure
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `tests/e2e/bridge/GodotHeadlessDriver.ts` — Driver to boot Godot headless
  - `tests/e2e/bridge/TypedBridgeClient.ts:718-720` — `getBridgeMethods()` already exists
  - `tests/e2e/bridge/bridge-contract.test.ts` — Pattern reference for test structure
  - `tests/e2e/bridge/types.ts:36-45` — `BridgeMethodRegistry` type already defined
  - `app/lib/godot/generated/bridge-registry.json` — INPUT from Task 1
  - `godot_project/scripts/GameBridge.gd:571-589` — `get_bridge_methods()` implementation

  **WHY Each Reference Matters**:
  - `getBridgeMethods()` is the KEY — it already returns what Godot has registered. We just need to compare it against the TS registry.
  - `BridgeMethodRegistry` type already defines the shape. No new types needed.

  **Acceptance Criteria**:
  - [ ] `tests/e2e/bridge/bridge-parity.test.ts` exists
  - [ ] Test boots headless Godot and calls `getBridgeMethods()`
  - [ ] Test reads `bridge-registry.json` and compares method lists
  - [ ] Test PASSES when bridge is in sync
  - [ ] Test FAILS when a method is missing from either side
  - [ ] Test runs as part of `pnpm test:bridge`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Parity test passes on current codebase
    Tool: Bash
    Steps:
      1. pnpm generate:bridge
      2. npx vitest run tests/e2e/bridge/bridge-parity.test.ts --config tests/e2e/bridge/vitest.config.ts
      3. Assert: exit code 0
      4. Assert: output contains "parity" test passing
    Expected Result: All parity checks pass
    Evidence: Test output captured

  Scenario: Parity test fails when method removed from GDScript
    Tool: Bash (manual simulation)
    Steps:
      1. Add a fake method to bridge-registry.json tsOnly exclusion list
      2. Remove a real method from the expected list  
      3. Re-run parity test
      4. Assert: test reports the mismatch
      5. Revert changes
    Expected Result: Clear failure message
    Evidence: Test failure output captured
  ```

  **Commit**: YES
  - Message: `test(bridge): add E2E parity test for TS ↔ GDScript bridge alignment`
  - Files: `tests/e2e/bridge/bridge-parity.test.ts`

---

### Task 5: CI Integration & Script Wiring

- [ ] 5. Wire up `package.json` scripts and verify the full pipeline

  **What to do**:
  - Add to root `package.json`:
    ```json
    {
      "scripts": {
        "generate:bridge": "npx tsx scripts/bridge-codegen.ts",
        "check:bridge": "npx tsx scripts/bridge-codegen.ts --check",
        "test:bridge": "vitest run --config tests/e2e/bridge/vitest.config.ts"
      }
    }
    ```
  - The `--check` flag in codegen: generates to a temp dir, diffs against committed files, exits non-zero if stale
  - Add `check:bridge` to the existing `pnpm build` or CI pipeline
  - Verify full end-to-end flow:
    1. `pnpm generate:bridge` → produces registry + GDScript validator
    2. `pnpm check:bridge` → passes (files are fresh)
    3. `pnpm test:bridge` → boots Godot, runs parity + contract tests
  - Document the workflow in a comment at the top of `scripts/bridge-codegen.ts`

  **Must NOT do**:
  - Do not modify existing `pnpm test` behavior
  - Do not add bridge tests to the main test suite (they require Godot binary)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Script wiring and verification
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  - `package.json` — Root package.json to add scripts
  - `tests/e2e/bridge/vitest.config.ts` — Existing vitest config for bridge tests

  **Acceptance Criteria**:
  - [ ] `pnpm generate:bridge` works
  - [ ] `pnpm check:bridge` exits 0 when files are fresh
  - [ ] `pnpm check:bridge` exits non-zero when files are stale
  - [ ] `pnpm test:bridge` runs all bridge tests (contract + parity)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full pipeline end-to-end
    Tool: Bash
    Steps:
      1. pnpm generate:bridge → Assert exit code 0
      2. pnpm check:bridge → Assert exit code 0
      3. pnpm test:bridge → Assert exit code 0
      4. Modify types.ts (add fake method)
      5. pnpm generate:bridge → Assert exit code 0 (regenerates)
      6. pnpm test:bridge → Assert exit code NON-ZERO (Godot doesn't have it)
      7. Revert types.ts
    Expected Result: Pipeline catches drift
    Evidence: Command outputs captured

  Scenario: check:bridge detects stale registry
    Tool: Bash
    Steps:
      1. pnpm generate:bridge
      2. echo "// force change" >> app/lib/godot/types.ts
      3. pnpm check:bridge → Assert exit code non-zero
      4. git checkout app/lib/godot/types.ts
    Expected Result: Stale detection works
    Evidence: Exit code and diff output captured
  ```

  **Commit**: YES
  - Message: `chore(bridge): wire up generate:bridge, check:bridge, test:bridge scripts`
  - Files: `package.json`, `scripts/bridge-codegen.ts` (--check flag)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(bridge): add codegen script to extract bridge registry` | `scripts/bridge-codegen.ts`, `app/lib/godot/generated/bridge-registry.json`, `package.json` | `pnpm generate:bridge` |
| 2 | `fix(godot): resolve LSP errors in bridge scripts` | `*.gd` files if needed | `lsp_diagnostics` |
| 3 | `feat(bridge): add generated GDScript validator for bridge parity` | `scripts/bridge-codegen.ts`, `BridgeValidation.gd`, `GameBridge.gd` | `pnpm generate:bridge` + LSP check |
| 4 | `test(bridge): add E2E parity test for TS ↔ GDScript alignment` | `bridge-parity.test.ts` | `pnpm test:bridge` |
| 5 | `chore(bridge): wire up generate:bridge, check:bridge, test:bridge scripts` | `package.json` | Full pipeline |

---

## Success Criteria

### Verification Commands
```bash
pnpm generate:bridge    # Expected: exit 0, produces registry + validator
pnpm check:bridge       # Expected: exit 0 (files are fresh)
pnpm test:bridge        # Expected: all tests pass (contract + parity)
tsc --noEmit            # Expected: no type errors
```

### Final Checklist
- [ ] `bridge-registry.json` accurately reflects `GodotBridge` interface
- [ ] `BridgeValidation.gd` runs in debug Godot builds
- [ ] Parity test compares TS registry vs running Godot engine
- [ ] `check:bridge` can be added to CI pipeline
- [ ] Adding a new method to `types.ts` requires updating GDScript (test enforces it)
- [ ] All existing 89 contract tests still pass
- [ ] No new runtime dependencies
- [ ] Existing web and native bridges unchanged

---

## Future Considerations (NOT in this plan)

These are documented for context but explicitly **deferred**:

1. **Generated bridge boilerplate** (Phase 4) — Auto-generate the ~800 lines of pass-through methods in `.web.ts` and `.native.ts`. High value but high risk. Do AFTER this plan is stable.

2. **TypedBridgeClient auto-generation** — Generate `TypedBridgeClient.ts` from the registry instead of maintaining 734 lines manually. Natural extension of Task 1.

3. **Web/Native behavioral parity tests** — Beyond structural parity (method exists), test that calling the same method on web and native produces equivalent results. Requires running both a browser and a native Godot instance.

4. **Hot-reload bridge validation** — Run validation on every Godot WASM rebuild (via the existing Godot watcher service) instead of just at startup.
