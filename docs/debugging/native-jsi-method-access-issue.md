# Native JSI Method Access Issue

## Problem Summary

When running on iOS native (via react-native-godot), certain GDScript methods on GameBridge cannot be accessed from JavaScript. The JSI bridge throws:

```
Exception in HostObject::get for prop 'set_linear_velocity': Unable to resolve name as property or method: set_linear_velocity
```

## Working vs Non-Working Methods

### Methods That WORK (can be called from JS)

| Method | Line in GameBridge.gd | Return Type | Notes |
|--------|----------------------|-------------|-------|
| `poll_events()` | 2838 | `String` | Returns JSON string |
| `create_mouse_joint()` | 1793 | `int` | Returns joint ID |
| `query_point_entity()` | 1969 | `Variant` | Returns entity ID or null |
| `destroy_joint()` | 1814 | `void` | |
| `set_mouse_target()` | 1808 | `void` | |

### Methods That DON'T WORK (JSI throws on property access)

| Method | Line in GameBridge.gd | Return Type | Notes |
|--------|----------------------|-------------|-------|
| `set_linear_velocity()` | 402 | `void` | 3 params |
| `set_angular_velocity()` | 419 | `void` | 2 params |
| `apply_impulse()` | 434 | `void` | 3 params |
| `apply_force()` | 449 | `void` | 3 params |
| `send_input()` | 455 | `void` | 4 params |
| `create_ui_button()` | 2739 | `void` | 7 params |

## Observations

1. **All working methods were added later** (higher line numbers, 1793+)
2. **All non-working methods are earlier in the file** (lines 402-455) OR have many parameters (create_ui_button at 2739)
3. **Return type doesn't seem to matter** - both `void` and non-void methods work/fail
4. **Parameter count might matter?** - working methods have 0-6 params, create_ui_button has 7

## What We've Tried

1. ✅ Full clean rebuild (`pnpm clean`, delete DerivedData, pods, rebuild from source)
2. ✅ Added `ios.buildReactNativeFromSource: true` to Podfile.properties.json
3. ✅ Added `ENV['RCT_METRO_PORT'] = '8085'` to Podfile
4. ✅ Changed from `callGameBridge()` dynamic access to direct method calls
5. ❌ Still fails - error occurs during property access itself

## Code Patterns

### Working Pattern (poll_events)
```typescript
const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
if (gameBridge?.poll_events) {  // Optional chaining - doesn't throw
  return gameBridge.poll_events();  // Direct call works
}
```

### Failing Pattern (set_linear_velocity)
```typescript
const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
gameBridge.set_linear_velocity(entityId, vx, vy);  // Throws on property access
```

Even with optional chaining, `gameBridge?.set_linear_velocity` returns `undefined` - the method simply isn't exposed.

## Hypotheses

1. **Godot PCK file is stale** - The `main.pck` might not include newer method definitions
2. **JSI binding limitations** - react-native-godot might only expose methods that exist at a certain point in the script loading
3. **Method registration timing** - Methods defined before `_ready()` might not be exposed
4. **GDScript compilation order** - Methods might need to be in a specific order or section

## Questions for Investigation

1. How does react-native-godot decide which GDScript methods to expose via JSI?
2. Is there a method registration/export mechanism we're missing?
3. Does the Godot PCK need to be rebuilt? How?
4. Are there limitations on method signatures (param count, types)?

## Environment

- react-native-godot: `@borndotcom/react-native-godot`
- Godot: 4.x (embedded via react-native-godot)
- Platform: iOS Simulator (iPhone 16e)
- React Native: 0.81.4
- Expo SDK: 54

## Files Involved

- `app/lib/godot/GodotBridge.native.ts` - TypeScript bridge implementation
- `godot_project/scripts/GameBridge.gd` - GDScript game bridge
- `app/ios/Slopcade/godot/main.pck` - Compiled Godot project

## Next Steps

- [ ] Check if main.pck needs rebuilding and how
- [ ] Investigate react-native-godot source for method exposure logic
- [ ] Test if moving method definitions to end of file helps
- [ ] Check if there's an explicit export/registration mechanism
