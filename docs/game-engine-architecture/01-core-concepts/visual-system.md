# Visual System

> **Entity rendering and styling in the game engine**
>
> This document covers how to style entities with colors, opacity, blend modes, and other visual properties.

---

## Visual Component

Every entity can have a `visual` component that defines how it renders. The visual type determines the shape, while additional properties control appearance.

### Basic Structure

```typescript
{
  visual: {
    type: "rect" | "circle" | "polygon" | "image" | "text",
    color: "#RRGGBB",      // Hex color (6 chars, no alpha)
    opacity: 0.0 - 1.0,    // Transparency (1.0 = fully opaque)
    zIndex: number,        // Layer ordering (higher = on top)
    blendMode: "mix" | "add" | "sub" | "mul",  // How colors combine
    // ... type-specific properties
  }
}
```

---

## Blend Modes

Blend modes control how the visual combines with content behind it.

| Mode | Effect | Use Case |
|------|--------|----------|
| `mix` | Normal alpha blending (default) | Standard overlays |
| `add` | Additive - brightens underlying content | Glows, highlights, light effects |
| `sub` | Subtractive - darkens underlying content | Shadows, darkening |
| `mul` | Multiply - tints underlying content | Color tinting, staining |

### Additive Blend Mode Example

For hover highlights or glow effects, use `add` blend mode with low opacity:

```typescript
{
  visual: {
    type: "rect",
    width: 2,
    height: 4,
    color: "#FFFFFF",    // White
    opacity: 0.15,       // 15% intensity
    blendMode: "add",    // Additive blending
  }
}
```

---

## Important: Opacity vs Hex Alpha

**Always use the `opacity` field for transparency, not hex alpha in the color string.**

The Godot renderer overwrites any alpha from the hex color with the `opacity` value. This means:

```typescript
// WRONG - The "26" alpha will be ignored
color: "#FFFFFF26"

// CORRECT - Use opacity field
color: "#FFFFFF",
opacity: 0.15
```

This is especially important when using blend modes, where the intensity of the effect is controlled by opacity.

---

## Visual Types

### Rectangle

```typescript
{
  visual: {
    type: "rect",
    width: 2,        // World units
    height: 1,
    color: "#3498db",
    opacity: 1.0,
  }
}
```

### Circle

```typescript
{
  visual: {
    type: "circle",
    radius: 0.5,     // World units
    color: "#e74c3c",
  }
}
```

### Image

```typescript
{
  visual: {
    type: "image",
    imageUrl: "https://example.com/sprite.png",
    imageWidth: 1,   // Display width in world units
    imageHeight: 1,  // Display height in world units
    scale: 1.0,      // Additional scale multiplier
    offsetX: 0,      // Offset from entity center
    offsetY: 0,
  }
}
```

### Text

```typescript
{
  visual: {
    type: "text",
    text: "Score: 100",
    fontSize: 16,
    color: "#FFFFFF",
  }
}
```

### Polygon

```typescript
{
  visual: {
    type: "polygon",
    vertices: [
      { x: 0, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
    ],
    color: "#9b59b6",
  }
}
```

---

## Layer Ordering (zIndex)

The `zIndex` property controls render order. Higher values render on top of lower values.

```typescript
// Background element
{ visual: { type: "rect", zIndex: -100, ... } }

// Normal game entity
{ visual: { type: "circle", zIndex: 0, ... } }

// UI overlay
{ visual: { type: "rect", zIndex: 500, ... } }
```

**Convention:**
- `-100` to `-1`: Background elements
- `0` to `99`: Normal game entities
- `100` to `499`: Foreground effects
- `500`+: UI overlays and highlights

---

## Runtime Visibility Control

Entities can be shown/hidden at runtime via the bridge:

```typescript
// From game systems or behaviors
bridge.setVisible(entityId, true);   // Show
bridge.setVisible(entityId, false);  // Hide
```

The `visible` property can also be set in entity definitions:

```typescript
{
  id: "hidden-element",
  template: "myTemplate",
  visible: false,  // Starts hidden
  transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
}
```

---

## See Also

- [Entity System](./entity-system.md) - Entity structure and templates
- [Behavior System](./behavior-system.md) - Dynamic visual behaviors (scale_oscillate, etc.)
