# Web Asset Loading: Base64 Bypass via Blob URLs

## Problem

### Original Issue
Godot's native `HTTPRequest` on web platform was returning corrupted data (15-byte "Asset not found" message instead of actual PNG data). This was likely due to CORS issues or Godot's HTTP client limitations on web.

### Workaround That Caused New Problems
The previous agent implemented a JavaScript fetch workaround but made a critical syntax error:

```gdscript
# WRONG - tries to call a method named "call" on the function
window._godotFetch.call("call", null, fetch_id, url)
```

This syntax attempts to call a method named `"call"` on the function object, rather than invoking the function itself. **The fetch was never actually being executed.**

### Secondary Problem: Base64 Encoding
Even if the fetch worked, the original approach used expensive base64 encoding:

```
JS: ArrayBuffer → btoa(base64 string) → pass to Godot
GDScript: Marshalls.base64_to_raw() → Image
```

**Issues:**
- Memory doubled: binary + base64 string (~33% larger)
- CPU overhead: `btoa()` encoding + `base64_to_raw()` decoding
- String boundary crossing between JS and Godot

## Solution

### 1. Fixed Function Invocation
```gdscript
# CORRECT - invoke the function directly
window._godotFetch(fetch_id, url)
```

### 2. Blob URL Approach (No Base64)

```
JS:
1. fetch(url) → Response
2. response.blob() → Blob
3. URL.createObjectURL(blob) → blob:localhost/UUID
4. Pass blob URL string to Godot

GDScript:
1. HTTPRequest fetches from blob URL (local, no CORS)
2. Gets binary body directly
3. Image.load_*_from_buffer(body)
4. URL.revokeObjectURL() to free memory
```

**Benefits:**
- No base64 encoding/decoding - data stays binary
- Single memory copy (Blob in JS, bytes in Godot)
- Blob URLs work with Godot's HTTPRequest since they're "local" URLs
- Proper memory cleanup via `URL.revokeObjectURL()`

## Data Flow Comparison

### Before (Broken + Expensive)
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ JS fetch()  │────▶│ ArrayBuffer      │────▶│ btoa()          │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
┌─────────────┐     ┌──────────────────┐     ┌────────▼────────┐
│ Godot HTTP  │◀────│ Base64 String    │◀────│ String (33%     │
│ Request     │     │ (33% larger)      │     │ larger!)        │
└─────────────┘     └──────────────────┘     └─────────────────┘
        │                                             │
        ▼                                             ▼
┌─────────────┐                               ┌─────────────────┐
│ CORP/CORS   │                               │ base64_to_raw() │
│ Issues!     │                               │ CPU overhead    │
└─────────────┘                               └─────────────────┘
```

### After (Fixed + Efficient)
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ JS fetch()  │────▶│ Blob             │────▶│ createObjectURL │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
┌─────────────┐                               ┌────────▼────────┐
│ Godot HTTP  │◀────│ blob:localhost/UUID ◀───│ Short string    │
│ Request     │     │ (local URL, no CORS)    │ (no encoding)   │
└─────────────┘     └──────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│ Direct binary   │
│ bytes (no       │
│ conversion)     │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Image.load_*_    │
│ from_buffer()   │
└─────────────────┘
```

## Files Modified

- `godot_project/scripts/bridge/VisualRenderer.gd`
  - `_setup_js_fetch_handler()`: Changed to use `r.blob()` + `URL.createObjectURL()`
  - `_on_js_fetch_complete()`: Updated callback signature to receive Blob URL
  - `_fetch_from_object_url()`: NEW - fetches Blob URL using Godot's HTTPRequest
  - `_revoke_object_url()`: NEW - cleans up Blob URLs to prevent memory leaks

## Future Improvements

1. **Progress Reporting**: Could use `XMLHttpRequest` with `progress` events for real-time download progress
2. **Native HTTPRequest**: Could investigate fixing Godot's native HTTPRequest for web with proper CORS headers
3. **SharedArrayBuffer**: For even faster zero-copy transfer between JS and Godot (requires specific headers)
