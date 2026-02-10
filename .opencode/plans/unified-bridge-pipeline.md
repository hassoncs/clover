# Unified Bridge Pipeline

## Goal
Create a codegen pipeline that parses the `GodotBridge` TypeScript interface and generates:
1. A JSON registry of all bridge methods
2. A `Window.GodotBridge` type declaration file
3. A GDScript validation contract
4. An e2e parity test that compares TS methods against the running Godot bridge

## Context Gathered

### Key Files
- `app/lib/godot/types.ts` — `GodotBridge` interface (extends `EffectsBridge`), ~100+ methods
- `godot_project/scripts/GameBridge.gd` — Central dispatcher with `_method_map`, `get_bridge_methods()` at line 571
- `tests/e2e/bridge/GodotHeadlessDriver.ts` — Headless Godot TCP driver
- `tests/e2e/bridge/TypedBridgeClient.ts` — Typed wrapper with `getBridgeMethods()`
- `tests/e2e/bridge/bridge-contract.test.ts` — Existing individual method tests
- `tests/e2e/bridge/vitest.config.ts` — Existing vitest config
- `app/lib/godot/GodotBridge.web.ts` lines 60-276 — Inline `Window.GodotBridge` declaration
- `scripts/inventory-bridge-handlers.ts` — Existing script that parses `_js_` handlers from GDScript

### Dependencies
- `ts-morph` already installed (`"ts-morph": "^27.0.2"` in root devDependencies)
- `tsx` already installed for running TS scripts

### Generated Directories (don't exist yet)
- `app/lib/godot/generated/`
- `godot_project/scripts/bridge/generated/`

### TS-Only Methods (no Godot counterpart)
- `initialize` — client-side lifecycle
- `dispose` — client-side cleanup

### Name Mapping
- GameBridge.gd uses `_to_camel_case()` to convert `snake_case → camelCase` for JS exposure
- Codegen needs `camelToSnake()` to convert TS names back to the Godot method map format
- Special case: `3D` → `_3d`

### EffectsBridge Methods (inherited by GodotBridge)
10 methods: `applyGraph`, `clearGraph`, `updateParams`, `start`, `pause`, `resume`, `stop`, `reset`, `snapshot`, `restore`

---

## Steps

### Step 1: Create `scripts/bridge-codegen.ts`

**New file.** Uses ts-morph to:
1. Parse `app/lib/godot/types.ts`
2. Find `EffectsBridge` and `GodotBridge` interfaces
3. Extract all methods with params, types, return types
4. Generate three output files

Key implementation details:
- Use `Project` from ts-morph with `app/tsconfig.json`
- Resolve inherited methods from `EffectsBridge`
- `camelToSnake()`: handle `3D` → `_3d` special case, then `[A-Z]` → `_lower`
- `simplifyTypeForWindow()`: convert complex TS types (GameDefinition, CompiledPlan, etc.) to simpler wire-level types for the Window declaration
- `TS_ONLY_METHODS` set: `initialize`, `dispose`

Output A: **`app/lib/godot/generated/bridge-registry.json`**
```json
{
  "generatedAt": "ISO timestamp",
  "sourceFile": "app/lib/godot/types.ts",
  "methods": [
    { "name": "applyGraph", "snakeName": "apply_graph", "params": [...], "returnType": "...", "tsOnly": false }
  ],
  "methodNames": ["applyGraph", ...],
  "snakeNames": ["apply_graph", ...],  // excludes TS-only
  "total": N,
  "bridgeTotal": M  // excludes TS-only
}
```

Output B: **`app/lib/godot/generated/window-godot-bridge.d.ts`**
- `declare global { interface Window { GodotBridge?: WindowGodotBridge } }`
- Exports `WindowGodotBridge` interface
- Includes the infrastructure fields: `_lastResult`, `_pendingQueries`, `query`
- All bridge methods with simplified types

Output C: **`godot_project/scripts/bridge/generated/BridgeContract.gd`**
- `class_name BridgeContract`
- `const EXPECTED_METHODS: Array[String]` — all snake_case method names
- `static func validate_bridge(method_map: Dictionary) -> Dictionary` — returns `{missing, extra, matched, expected, actual, valid}`

### Step 2: Create `tests/e2e/bridge/bridge-parity.test.ts`

**New file.** Uses vitest + GodotHeadlessDriver:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GodotHeadlessDriver from "./GodotHeadlessDriver.js";
import { TypedBridgeClient } from "./TypedBridgeClient.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the generated registry
const registryPath = resolve(__dirname, "../../../app/lib/godot/generated/bridge-registry.json");

// Known name mapping overrides (TS camelCase → Godot snake_case that don't follow standard conversion)
const NAME_OVERRIDES: Record<string, string> = {
  // Add any non-standard mappings here
};

// Methods implemented in TS adapter only, never sent to Godot
const TS_ONLY = new Set(["initialize", "dispose"]);

describe("Bridge Parity", () => {
  let driver: GodotHeadlessDriver;
  let bridge: TypedBridgeClient;
  let registry: { snakeNames: string[]; methods: Array<{ name: string; snakeName: string; tsOnly: boolean }> };

  beforeAll(async () => {
    registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    driver = new GodotHeadlessDriver({ quiet: true });
    await driver.start();
    bridge = new TypedBridgeClient(driver);
  });

  afterAll(async () => {
    await driver.stop();
  });

  it("registry file exists and has methods", () => {
    expect(registry.snakeNames.length).toBeGreaterThan(50);
  });

  it("every TS bridge method exists in running Godot", async () => {
    const godotResult = await bridge.getBridgeMethods();
    const godotMethodNames = new Set(godotResult.methods.map(m => m.name));

    const missing: string[] = [];
    for (const snakeName of registry.snakeNames) {
      if (!godotMethodNames.has(snakeName)) {
        missing.push(snakeName);
      }
    }

    if (missing.length > 0) {
      console.error("TS methods missing from Godot:", missing);
    }
    expect(missing).toEqual([]);
  });

  it("reports undocumented Godot methods (warning)", async () => {
    const godotResult = await bridge.getBridgeMethods();
    const tsNames = new Set(registry.snakeNames);
    const extra = godotResult.methods
      .map(m => m.name)
      .filter(name => !tsNames.has(name));

    if (extra.length > 0) {
      console.warn("Godot methods not in TS interface:", extra);
    }
    // This is informational, not a failure
  });
});
```

### Step 3: Wire up `package.json` scripts

Add two entries to root `package.json` scripts:
```json
"generate:bridge": "tsx scripts/bridge-codegen.ts",
"test:bridge": "vitest run --config tests/e2e/bridge/vitest.config.ts"
```

### Step 4: Refactor `GodotBridge.web.ts` Window declaration

Replace the inline 215-line `declare global { interface Window { GodotBridge?: { ... } } }` block (lines 60-276) with:
```typescript
/// <reference path="./generated/window-godot-bridge.d.ts" />
```

This is lower priority and can be deferred if the generated types need tuning.

---

## Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `scripts/bridge-codegen.ts` | CREATE | ~200 |
| `app/lib/godot/generated/bridge-registry.json` | CREATE (generated) | — |
| `app/lib/godot/generated/window-godot-bridge.d.ts` | CREATE (generated) | — |
| `godot_project/scripts/bridge/generated/BridgeContract.gd` | CREATE (generated) | — |
| `tests/e2e/bridge/bridge-parity.test.ts` | CREATE | ~70 |
| `package.json` | EDIT (add 2 scripts) | +2 |
| `app/lib/godot/GodotBridge.web.ts` | EDIT (replace inline Window type) | -215, +1 |

## Verification

1. `pnpm generate:bridge` — runs codegen, creates all generated files
2. `tsc --noEmit` — type-check passes
3. `pnpm test:bridge` — runs e2e bridge tests including parity test (requires Godot installed)

## Risks / Notes

- The `simplifyTypeForWindow()` function needs to handle all complex types. If a new complex type is added to `GodotBridge`, codegen may produce invalid types. The fix is to add a mapping in that function.
- The parity test requires Godot to be running headlessly. It won't work in CI without a Godot binary.
- The `camelToSnake` conversion must match `_to_camel_case` in GameBridge.gd exactly (inverse). The `3D`/`3d` special case is handled.
- The Window.GodotBridge refactor (Step 4) may need manual adjustments if the generated types don't match perfectly. Can be deferred.
