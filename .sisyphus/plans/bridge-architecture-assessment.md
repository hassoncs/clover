# Bridge Architecture Assessment

> Feb 12, 2026. Prompted by 200 console errors after bridge refactoring.

---

## The Core Requirement

All communication between TypeScript and Godot must have **guaranteed type safety at build time, verifiable in CI**. When things are auto-registered on the Godot side that TS doesn't know about, that's fine — don't print errors unless it actually matters.

---

## What Problem Are We Solving?

Two runtimes talk to each other. TS owns logic, Godot owns physics/rendering. ~112 methods cross the boundary, using four dispatch modes:

| Mode | Count | Example | Transport |
|------|-------|---------|-----------|
| `dispatch.sync()` | 75 | `setPosition`, `applyImpulse` | Direct function call (web), JSON over JSI (native) |
| `dispatch.async()` | 14 | `getEntityTransform`, `queryPoint` | QuerySystem req/res (web), JSI promise (native) |
| `dispatch.effectsSync()` | 13 | `applySpriteEffect`, `screenShake` | Direct call to effects module |
| `dispatch.effectsAsync()` | 10 | `applyGraph`, `snapshot` | RPC through QuerySystem |

~20 methods use `JSON.stringify` for complex objects. ~92 pass primitives directly, including struct-flattened args (e.g., `Vec2` → `x, y`; `RevoluteJointDef` → 10 primitives).

---

## What the Codegen Actually Does

The 1,407-line `bridge-codegen.ts` generates six artifacts from `types.ts`:

| Artifact | What it does | Could you lose it? |
|----------|-------------|-------------------|
| `bridge-methods.ts` | Struct flattening, JSON encoding, dispatch routing per method | **No.** This is the core value. Without it, you'd hand-write `velocity?.x ?? 0, velocity?.y ?? 0` for every Vec2, or JSON.stringify everything (perf hit). |
| `bridge-registry.json` | Metadata: method names, categories, snake_case mappings | **No.** This is what `bridge-verify.ts` checks against Godot scripts in CI. |
| `BridgeMethodMap.gd` | Godot-side contract: expected methods + validation function | **No.** This is the Godot-side CI check. |
| `BridgeValidation.gd` | Expected method list with parameter counts | **No.** Used by Godot contract tests. |
| `MockGodotBridge.ts` | Full mock with `vi.fn()` for every method | Nice-to-have. Saves writing mocks by hand. |
| `window-godot-bridge.d.ts` | TypeScript types for `window.GodotBridge` (flattened wire signatures) | Nice-to-have. Types only, no runtime effect. |

**The struct flattening is the key value.** Without codegen, you'd either:
- Hand-write the flattening for each method (what we had before, error-prone)
- JSON.stringify everything (slower on the 60fps hot path)
- Build a runtime reflection system (complex, fragile)

---

## Why It Keeps Breaking (Specifically)

Not "the architecture is wrong." These are specific, fixable issues:

### 1. Validation fires before all methods are registered
`_build_method_map()` validates immediately. `GameBridgeEffects._ready()` registers methods later. Result: 19 "Missing bridge method" warnings for effects methods that ARE registered — just not yet.

**Fix**: Move validation to `_finalize_js_bridge()` (already deferred via `call_deferred`).

### 2. Internal methods use the `_js_` prefix
Methods like `_js_on_collision`, `_js_get_transform`, `_js_clear` on SyncSystem, EventEmitter, PixelBufferManager are internal to their modules. Auto-discovery picks them up, validator flags them as "Unregistered."

**Fix**: Rename to `_internal_*` or `_handle_*`. The `_js_` prefix should exclusively mean "bridge dispatch method."

### 3. CI doesn't fail on Godot-only methods
`bridge-verify.ts` reports `godotOnly` methods as informational (ℹ️), not errors. CI passes even when Godot has methods that aren't in the contract. These show up as warnings at runtime.

**Fix**: Either fail CI on `godotOnly` (strict) or suppress the runtime warnings for non-contract methods (pragmatic). The pragmatic option is better — extra Godot methods aren't harmful, they're just noise.

### 4. Chrome shows Godot `push_warning()` as red ERROR
This is a display issue, not a real error. Godot's warnings appear at error severity in Chrome's console. The game works fine.

**Fix**: Change `push_warning` to `print` for the "Unregistered" direction. Keep `push_warning` only for "Missing" (TS expects, Godot doesn't have).

---

## Should We Switch Approaches?

**No.** Here's the evidence:

### What alternatives offer

| Approach | Solves contract drift? | Solves struct flattening? | Migration effort | Performance impact |
|----------|----------------------|--------------------------|-----------------|-------------------|
| **Protobuf** | Yes (compiler enforces) | No (GDScript still untyped) | Medium-High | Slight improvement (binary) |
| **JSON-RPC** | Partially (method dispatch) | No | Low | Regression (JSON on hot path) |
| **Convention auto-discovery** | No (loses TS types) | No (loses flattening) | Medium | Regression (JSON everything) |
| **Fix current gaps** | Yes (close the 4 issues above) | Already done | Low | None |

Every alternative either loses the struct flattening (which the codegen provides) or doesn't actually solve the contract verification problem any better than what we have.

### Why the "convention-based" proposal doesn't work

The proposal to use `bridge_` prefix + auto-discovery + Proxy has a fundamental problem: **it gives up the build-time type safety you need.** A TS Proxy that forwards `GodotBridge.typoMethod()` compiles fine but fails at runtime. That violates the core requirement.

The codegen exists precisely to make the TS compiler enforce the contract. `types.ts` → generated `bridge-methods.ts` → the compiler catches any call to a method that doesn't exist. Removing the codegen removes the compile-time guarantee.

### What actually needs to happen

The current system is ~95% correct. The 5% that's broken is:

| Issue | Fix | Effort |
|-------|-----|--------|
| Validation timing race | Move to `_finalize_js_bridge()` | 10 min |
| `_js_` prefix overloaded | Rename internal methods to `_internal_*` | 1-2 hours |
| CI doesn't catch Godot-only methods | Add `ALLOWED_INTERNAL` set to generated validator | 30 min |
| Chrome shows warnings as errors | Change `push_warning` to `print` for non-critical | 10 min |

Total: ~2-3 hours of focused work. Not an architecture change.

---

## What Good Looks Like After the Fix

1. **`pnpm generate:bridge --check` in CI** catches any drift between `types.ts` and generated artifacts.
2. **`bridge-verify.ts` in CI** catches any mismatch between the TS registry and actual Godot `_js_*` methods. `godotOnly` methods that are in `ALLOWED_INTERNAL` pass silently.
3. **Godot runtime validation** runs after ALL modules register (deferred). Only warns on "Missing" methods (TS expects, Godot lacks). Extra Godot methods are silent.
4. **Zero console errors** when playing a game. Warnings only appear when something is genuinely broken.
5. **Adding a new method** = edit `types.ts` + write `_js_` handler + `pnpm generate:bridge`. Same as today, but the validation actually works end-to-end.

---

## Summary

| Question | Answer |
|----------|--------|
| Is the codegen approach right? | **Yes.** It provides build-time type safety and struct flattening that no alternative matches. |
| Why does it keep breaking? | Four specific implementation bugs, not architecture problems. |
| Should we switch to Protobuf/JSON-RPC/auto-discovery? | **No.** Each loses something critical (types, flattening, or build-time safety). |
| What fixes it? | Fix validation timing, rename internal `_js_*` methods, update CI checks, fix warning levels. ~2-3 hours. |
| When would we revisit? | If we need 50+ new methods rapidly, or if Godot adds static typing. |
