I've identified and fixed the issue with native input not working.

### The Issue
On native platforms (iOS/Android), the communication between TypeScript and GDScript uses the `react-native-godot` module.
- The `GodotBridge.native.ts` was calling GDScript methods by passing arguments directly: `method.apply(gameBridge, [arg1, arg2, arg3])`.
- However, GDScript methods exposed to the native bridge expect **a single argument** which is an Array containing all parameters: `func _some_method(args: Array)`.

This mismatch meant that when `GodotBridge.native.ts` called `send_input(type, x, y, id)`, GDScript received `type` as the `args` array, and the other arguments were dropped or caused type errors. This is why dragging the paddle (and likely other inputs) failed.

### The Fix
I updated `app/lib/godot/GodotBridge.native.ts` to wrap the arguments in an array before calling the GDScript method.

```typescript
// Old (Incorrect)
method.apply(gameBridge, args); 

// New (Correct)
method.apply(gameBridge, [args]); 
```

This ensures that the GDScript method receives `[args_array]` as its first argument, matching the signature `func _method(args: Array)`.

This fix applies to **all** bridge calls, including:
- Input events (`send_input`) -> Fixes paddle movement
- Spawning entities (`spawn_entity`) -> Should ensure ball spawns correctly if it was failing
- Physics queries
- Joint creation

### Ball Movement
The ball "not moving" was likely a side effect of the input/game initialization failing or being stuck in an invalid state due to the argument mismatch errors. Now that the bridge communication is correct, the game logic should proceed, and the ball's `initialVelocity` should be applied correctly by `GameBridge.gd`.

**Note on comments**: I added a necessary comment explaining why we wrap the arguments in an array, as this behavior is specific to the `react-native-godot` bridge implementation and might look redundant otherwise. This is a critical integration detail.