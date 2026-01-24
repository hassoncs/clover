# Native Image Loading Issue in react-native-godot

## Problem Summary

Dynamic image loading works on web but fails silently on iOS native when using `react-native-godot`.

## Environment

- **Package**: `@borndotcom/react-native-godot`
- **Godot Version**: 4.5.1
- **Platform**: iOS (simulator and device)
- **React Native**: Expo SDK 54

## Observed Behavior

### Web (Working)
- `setEntityImage(entityId, url, width, height)` successfully loads remote images
- Godot's `HTTPRequest` node fetches the URL and creates textures
- Images display correctly on entities

### Native (Failing)
- Same API call executes without errors
- No network request appears to be made
- No error logs from Godot
- Entity continues displaying placeholder (colored box with "1" or "2" text)
- The `set_entity_image` function in GDScript is being called (verified via method lookup)

## Technical Details

### Current Implementation Flow

1. **React Native** calls `bridge.setEntityImage("box1", "https://example.com/image.png", 2, 2)`

2. **GodotBridge.native.ts** uses `callGameBridge`:
```typescript
setEntityImage(entityId: string, url: string, width: number, height: number) {
  callGameBridge('set_entity_image', entityId, url, width, height);
}
```

3. **callGameBridge** executes via worklet:
```typescript
function callGameBridge(methodName: string, ...args: unknown[]) {
  runOnGodotThread(() => {
    'worklet';
    const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
    if (gameBridge) {
      const method = gameBridge[methodName];
      if (typeof method === 'function') {
        method.apply(gameBridge, args);
      }
    }
  });
}
```

4. **GameBridge.gd** `set_entity_image` creates HTTPRequest:
```gdscript
func set_entity_image(entity_id: String, url: String, width: float, height: float) -> void:
    # ... entity lookup ...
    
    var http = HTTPRequest.new()
    add_child(http)
    
    http.request_completed.connect(func(result, response_code, headers, body):
        # ... create texture from body ...
    )
    
    var err = http.request(url)
    if err != OK:
        push_error("[GameBridge] Failed to start texture download: " + url)
```

## Suspected Root Cause

The embedded Godot runtime in `react-native-godot` likely has limited or no networking capabilities. Possible reasons:

1. **HTTPRequest not supported**: The embedded engine may not include the HTTP client module
2. **Sandboxing**: iOS app sandbox may prevent Godot's internal HTTP client from making requests
3. **No main loop for async**: The embedded runtime may not process HTTPRequest callbacks properly
4. **TLS/SSL issues**: Certificate validation may fail silently in embedded context

## Questions for Research

1. Does `react-native-godot` support Godot's `HTTPRequest` node?
2. Are there any documented limitations of the embedded Godot runtime?
3. Is there a way to pass binary data (images) from React Native to the Godot runtime?
4. Does the Godot worklet bridge support `PackedByteArray` or similar binary types?
5. Are there alternative approaches used by other react-native-godot projects for asset loading?

## Potential Workarounds

### Option A: Base64 Transfer (Heavy)
- Fetch image in React Native
- Convert to base64 string
- Pass to Godot via bridge
- Decode in GDScript using `Marshalls.base64_to_raw()`

**Concerns**: Large memory overhead, slow for big images

### Option B: Bundled Assets Only
- Pre-bundle all images in Godot project
- Use `res://` paths instead of URLs
- Lose dynamic image loading capability

### Option C: File System Bridge
- Download image to app's file system in React Native
- Pass file path to Godot
- Load from disk using `Image.load()`

**Concerns**: Requires file path that Godot can access

### Option D: Shared Memory / Direct Buffer
- Investigate if react-native-godot supports passing ArrayBuffer/Uint8Array
- Could avoid base64 encoding overhead

## Related Files

- `app/lib/godot/GodotBridge.native.ts` - Native bridge implementation
- `godot_project/scripts/GameBridge.gd` - GDScript bridge (lines 964-1022)
- `app/app/examples/dynamic_images.tsx` - Test example

## Test Case

The `dynamic_images` example auto-loads images on mount:
```typescript
bridge.setEntityImage("box1", "https://dummyimage.com/200x200/000/fff.png&text=1", 2, 2);
bridge.setEntityImage("box2", "https://dummyimage.com/200x200/ff0/000.png&text=2", 2, 2);
```

Expected: Two boxes with loaded PNG images
Actual: Two boxes with placeholder rectangles showing "1" and "2"
