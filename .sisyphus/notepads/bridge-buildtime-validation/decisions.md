# Decisions - Bridge Build-Time Validation

## Architectural Choices

### Decision: Canonical Bridge Naming & Contract Identity Policy

**Date:** 2026-02-11
**Status:** Accepted
**Scope:** Godot↔TypeScript bridge validation naming conventions

---

#### 1. TypeScript-First camelCase Is Canonical Identity

The **canonical contract identity** for all bridge methods is the **TypeScript camelCase name** as defined in `app/lib/godot/types.ts` (the `GodotBridge` and `EffectsBridge` interfaces).

- `tsName` in the generated registry is the single canonical identifier for each method.
- All validation, test assertions, and error messages MUST reference methods by their `tsName`.
- Example: `setLinearVelocity` is canonical, not `set_linear_velocity`.

**Rationale:** TypeScript is the authoring language. Game authors, tests, and the React Native layer interact with camelCase method names exclusively. Godot's snake_case is an internal implementation detail.

#### 2. snake_case→camelCase Mapping via Generated Metadata

The mapping between Godot's internal snake_case names and canonical camelCase identities is defined **exclusively** through generated metadata, not through ad hoc runtime fallback logic.

**How it works today:**
- `scripts/bridge-codegen.ts` reads `app/lib/godot/types.ts` using ts-morph.
- For each method, it computes `snakeName` via the `camelToSnake()` transform (line 65-75).
- The generated `bridge-registry.json` stores both `tsName` (canonical) and `snakeName` (Godot internal) for every method.
- The generated `BridgeValidation.gd` uses `tsName` as dictionary keys for validation (line 229-230 of codegen).
- `GameBridge.gd` registers methods in `_method_map` using snake_case keys internally, then converts to camelCase for JS bridge exposure via `_to_camel_case()` (line 440-455).

**The transform rules (codegen `camelToSnake`):**
- `([a-z0-9])([A-Z])` → `$1_$2` (standard camelCase split)
- `([23])D(?=[A-Z]|$)` → `_$1d_` (preserves "3D"/"2D" as `_3d_`)
- `([a-z])(\d)` → `$1_$2` (letter-to-digit boundary)
- `([A-Z])([A-Z][a-z])` → `$1_$2` (acronym boundary)
- Collapse multiple underscores, strip leading/trailing, lowercase

**The reverse transform (GameBridge.gd `_to_camel_case`):**
- Splits on `_`, capitalizes each part after the first
- Special-cases `3d` → `3D` and `2d` → `2D`

**Policy:** These transforms are authoritative. If a naming discrepancy arises between TypeScript and Godot, the codegen transform is the source of truth. No manual mapping tables or fallback lookups are permitted.

#### 3. Bridge Codegen Is Authoritative Source for Validator Identity

`scripts/bridge-codegen.ts` is the **single source of truth** for what methods exist in the bridge contract and how they are identified.

**It generates four artifacts from `types.ts`:**
1. `app/lib/godot/generated/bridge-registry.json` — canonical method metadata (tsName, snakeName, params, categories)
2. `godot_project/scripts/bridge/generated/BridgeValidation.gd` — Godot-side validation dictionary
3. `tests/e2e/bridge/generated/TypedBridgeClient.ts` — typed test client
4. `app/lib/godot/__tests__/generated/MockGodotBridge.ts` — typed mock for unit tests

**Policy:** Any code that needs to know "what methods does the bridge have?" MUST consume these generated artifacts. It MUST NOT maintain its own independent list of method names.

#### 4. Handwritten Duplicate Name Lists Are Forbidden

**No test, validator, or runtime code may maintain a handwritten list of bridge method names.**

Examples of what is forbidden:
- A test file containing `const EXPECTED_METHODS = ['setLinearVelocity', 'applyImpulse', ...]`
- A validator with a hardcoded method count assertion like `expect(methods.length).toBe(87)`
- Any manual snake_case↔camelCase mapping table outside of codegen

**Instead, all such code must:**
- Import from `bridge-registry.json` for method enumeration
- Use the generated `TypedBridgeClient` for typed bridge calls in tests
- Use the generated `MockGodotBridge` for unit test mocks
- Use `BridgeValidation.gd` for Godot-side validation

**Rationale:** Handwritten lists inevitably drift from the source of truth. When a method is added to `types.ts`, only `pnpm generate:bridge` should be required to propagate the change — not manual updates across multiple files.

---

#### Summary Table

| Concern | Policy | Authority |
|---------|--------|-----------|
| Canonical method ID | TypeScript camelCase (`tsName`) | `app/lib/godot/types.ts` |
| snake_case mapping | Generated via `camelToSnake()` | `scripts/bridge-codegen.ts` |
| Method enumeration | Generated artifacts only | `bridge-registry.json`, `BridgeValidation.gd` |
| Test bridge calls | Generated typed client | `TypedBridgeClient.ts` |
| Test mocks | Generated mock | `MockGodotBridge.ts` |
| Handwritten name lists | **Forbidden** | N/A |
| Propagation workflow | `types.ts` → `pnpm generate:bridge` → all artifacts | Codegen pipeline |
