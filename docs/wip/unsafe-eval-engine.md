# WIP: UnsafeEvalEngine for Script Sandbox

## Goal

Get console.log calls from game scripts to appear in the browser console (and be captured by the MCP's Playwright log listener). This unblocks game development by allowing script debugging.

## Background

The project uses a `ScriptSandbox` system to run game logic scripts. Originally this used `QuickJSEngine` (a WASM-based JavaScript sandbox), but we discovered a bug: **disposing QuickJS function handles after `setProp` severs the host-side callback**. This means `console.log` calls from inside QuickJS silently fail.

We're creating an `UnsafeEvalEngine` as a temporary replacement that uses native JS `eval()` instead of QuickJS. Once working, we can debug the QuickJS implementation separately.

## Key Files

| File | Purpose |
|------|---------|
| `app/lib/scripting/engine/UnsafeEvalEngine.ts` | New unsafe eval implementation (WIP) |
| `app/lib/scripting/engine/QuickJSEngine.ts` | Original QuickJS implementation (broken console) |
| `app/lib/scripting/ScriptSandbox.ts` | Uses the engine, wraps scripts, calls hooks |
| `app/lib/scripting/types.ts` | Type definitions |

## Current State

`ScriptSandbox.ts` now imports `UnsafeEvalEngine` instead of `QuickJSEngine`.

The script wrapper in `ScriptSandbox.ts`:
```javascript
const SCRIPT_WRAPPER_PREFIX = `
var exports = {};
(function(exports) {
`;

const SCRIPT_WRAPPER_SUFFIX = `
})(exports);
exports;
`;
```

This wraps user scripts to create an `exports` object that can have `onStart`, `onUpdate`, `onInput`, `onCollision` hooks.

## The Challenge

The `UnsafeEvalEngine` must:
1. Maintain a persistent `sandbox` object across multiple `evaluate()` calls
2. Pass sandbox variables (like `console`, `exports`, `__ctx__`) into evaluated code
3. Capture the return value of expression statements (like `exports;`)
4. Store the returned `exports` object back into sandbox for subsequent calls

The tricky part: `new Function()` creates isolated scopes, so variables declared in one eval aren't visible in the next. We need to:
- Pass `exports` as a parameter to subsequent evals
- Use `eval()` to properly handle expression return values

## Current Implementation Attempt

```typescript
evaluate(code: string, phase: ScriptErrorReport['phase'] = 'load'): ScriptResult<unknown> {
  // ... error checks ...
  
  try {
    const sandbox = this.sandbox;
    const keys = Object.keys(sandbox);
    const values = keys.map(k => sandbox[k]);
    
    // Pass sandbox vars as params, use eval for expression handling
    const fn = new Function(...keys, '__code__', 'return eval(__code__)');
    const value = fn(...values, code);
    
    // Store exports object if returned
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ('onStart' in obj || 'onUpdate' in obj || 'onInput' in obj || 'onCollision' in obj) {
        sandbox['exports'] = obj;
      }
    }
    
    return { success: true, value };
  } catch (error) {
    return { success: false, error: this.extractError(error, phase) };
  }
}
```

## Testing

Use the game-inspector MCP to test:

```bash
# Open a scripted game
mcp_game-inspector_open name="breakoutScripted"

# Step to trigger script execution
mcp_game-inspector_step frames=5

# Check script system state
mcp_game-inspector_debug_script_system

# Test console logging
mcp_game-inspector_debug_test_script_console waitMs=200
```

Expected results when working:
- `scriptSystemState.hasOnStart: true` (hooks detected)
- `scriptSystemState.onStartCalled: true` (script ran)
- `scriptSystemState.lastError: null` (no errors)
- Console logs with `[Script]` prefix appear in captured logs

## QuickJS Issue (for later)

The root cause in QuickJSEngine: disposing function handles after `setProp` severs callbacks.

```typescript
// BROKEN - callback stops working after dispose
const logFn = ctx.newFunction('log', (...args) => { ... });
ctx.setProp(consoleObj, 'log', logFn);
logFn.dispose();  // <-- This breaks the callback!
```

Fix: Keep handles alive until engine disposal:
```typescript
private retainedHandles: QuickJSHandle[] = [];

// In setupConsole:
this.retainedHandles.push(logFn, warnFn, errorFn);
// Don't dispose here

// In dispose():
for (const handle of this.retainedHandles) {
  handle.dispose();
}
```

This fix is already in `QuickJSEngine.ts` but we switched to `UnsafeEvalEngine` to verify console logging works at all before debugging further.

## Next Steps

1. Get `UnsafeEvalEngine` working with proper scope persistence
2. Verify console.log appears in MCP captured logs
3. Test full game script execution (onStart, onUpdate, onInput, onCollision)
4. Once confirmed working, optionally debug QuickJS or keep unsafe for dev

## How to Test Manually

```typescript
// In browser console or debug_eval:
const engine = new UnsafeEvalEngine({});
await engine.initialize();
engine.setupConsole({
  log: (...args) => console.log('[Script]', ...args),
  warn: (...args) => console.warn('[Script]', ...args),
  error: (...args) => console.error('[Script]', ...args),
});

// Evaluate script wrapper
const result = engine.evaluate(`
  var exports = {};
  (function(exports) {
    exports.onStart = function(ctx) {
      console.log('Hello from script!');
    };
  })(exports);
  exports;
`);

console.log('Result:', result);
console.log('Exports in sandbox:', engine.sandbox?.exports);

// Should now be able to call:
engine.evaluate('exports.onStart({})');
// And see "[Script] Hello from script!" in console
```
