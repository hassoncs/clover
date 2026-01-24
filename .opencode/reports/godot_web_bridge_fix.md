I've fixed the issue causing the "Failed to parse collision data: undefined" warning.

### Root Cause
The Godot GDScript bridge (`GameBridge.gd`) was using `JavaScriptObject.call("call", null, [args])` to invoke JavaScript callbacks. This pattern was incorrectly passing the arguments array `[arg1, arg2...]` as the *first argument* to the callback, rather than unpacking them.

As a result:
1. **Collision Callback (Detailed)**: Received `[[json_string]]` instead of `json_string`. It worked accidentally because `Array.toString()` coerces to the string content, so `JSON.parse([json_str])` succeeded.
2. **Collision Callback (Legacy)**: Received `[[entityA, entityB, impulse]]`. The `entityB` argument in JS became `undefined`.
   - `GodotBridge.web.ts` checks `if (entityB === undefined)` -> `true` (assumes new JSON format).
   - It tries `JSON.parse(dataOrEntityA)`.
   - `dataOrEntityA` is the array `[entityA, entityB, impulse]`.
   - `JSON.parse("entityA,entityB,impulse")` fails with SyntaxError.
   - The catch block logs the error, but since the variable `dataOrEntityA` was holding the array, and the error logging might have been confused or the array evaluation resulted in `undefined` context in the console log.

### Fix Applied
I updated `godot_project/scripts/GameBridge.gd` to use `apply` instead of `call` for all JavaScript callbacks. This ensures the arguments array is correctly unpacked when invoking the JS function.

```gdscript
# Before (Incorrect - passed array as first arg)
_js_collision_callback.call("call", null, [json_str])

# After (Correct - unpacks array into arguments)
_js_collision_callback.call("apply", null, [json_str])
```

I applied this fix to:
- `_notify_js_input_event`
- `_notify_js_collision` (Legacy)
- `_notify_js_collision_detailed`
- `_notify_js_destroy`

This will ensure `GodotBridge.web.ts` receives the correct arguments for collision events, input events, and entity destruction.