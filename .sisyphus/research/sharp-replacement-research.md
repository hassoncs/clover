# Research: Replacing Sharp in Cloudflare Workers Environment

## Problem Statement

We have a Cloudflare Workers API that needs to generate PNG silhouette images programmatically. Currently, we use the `sharp` library for this, but **sharp cannot run in Cloudflare Workers** because it requires native Node.js modules (`node:child_process`, `node:fs`, etc.) that don't exist in the Workers runtime.

This is breaking our test suite: tests that import the tRPC router transitively import Sharp, causing all tests to fail with:
```
Error: No such module "node:child_process"
```

## Current Sharp Usage

Sharp is used in **2 files** for **2 distinct purposes**:

### 1. Canvas Creation + Pixel Compositing (`ui-component.ts`)

Creates nine-patch silhouettes by:
- Creating a blank RGBA canvas with a background color
- Compositing raw pixel buffers at specific positions
- Exporting as PNG

```typescript
import sharp from 'sharp';

const canvas = sharp({
  create: {
    width: 256,
    height: 256,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 255 },
  },
});

// Create raw RGBA buffer
const rect = Buffer.alloc(width * height * 4);
for (let py = 0; py < height; py++) {
  for (let px = 0; px < width; px++) {
    const idx = (py * width + px) * 4;
    rect[idx] = 64;     // R
    rect[idx + 1] = 64; // G
    rect[idx + 2] = 64; // B
    rect[idx + 3] = 255; // A
  }
}

const result = await canvas
  .composite([
    {
      input: rect,
      raw: { width, height, channels: 4 },
      left: x,
      top: y,
    },
  ])
  .png()
  .toBuffer();
```

### 2. SVG to PNG Conversion (`ui-component-svg.ts`)

Renders SVG strings to PNG:

```typescript
import sharp from 'sharp';

const svg = `
  <svg width="256" height="64" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="20" width="256" height="24" rx="8" ry="8" fill="#606060" />
  </svg>
`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
```

## Requirements for Replacement

We need a library or approach that can:

1. **Run in Cloudflare Workers** - No native Node.js modules, must be pure JavaScript/WASM
2. **Create blank RGBA canvases** with solid color backgrounds
3. **Draw filled rectangles** at specific positions with specific colors
4. **Draw filled circles/ellipses** at specific positions
5. **Draw rounded rectangles** (rectangles with corner radius)
6. **Render SVG to PNG** (for complex shapes with paths)
7. **Export to PNG format** as `Uint8Array` or `Buffer`
8. **Work server-side** (no DOM/browser APIs unless polyfilled)

### Shapes We Need to Draw

| Shape | Use Case |
|-------|----------|
| Filled rectangle | Nine-patch borders, panels |
| Filled circle | Button silhouettes |
| Rounded rectangle | Progress bars, scroll bars |
| SVG paths | Tab bars, complex UI shapes |

### Typical Dimensions

- Canvas sizes: 64x64, 128x128, 256x256, 512x512
- Output: PNG, RGBA, 8-bit depth

## Environment Constraints

- **Runtime**: Cloudflare Workers (V8 isolate, no Node.js)
- **Available APIs**: 
  - Standard Web APIs (fetch, crypto, TextEncoder, etc.)
  - WebAssembly
  - NO: fs, child_process, native addons
- **Bundle size**: Prefer small, but WASM modules are acceptable
- **Async/sync**: Either is fine

## Potential Solutions to Research

### 1. Pure JavaScript PNG Libraries
- `pngjs` - Can it create images from scratch?
- `upng-js` - Lightweight PNG encoder
- `fast-png` - Fast PNG encoder/decoder

### 2. Canvas Implementations for Workers
- `@aspect-ratio/svg-to-png` - SVG to PNG via WASM
- `resvg-wasm` / `resvg-js` - SVG renderer in WASM (from Rust)
- `canvaskit-wasm` - Skia in WASM (heavy but full-featured)

### 3. Manual Pixel Manipulation + PNG Encoding
- Generate raw pixel arrays manually
- Use a minimal PNG encoder to output

### 4. Build-time Generation
- Generate all silhouettes at build time as static assets
- Trade flexibility for simplicity

## Questions for Research

1. **What is the smallest library** that can do canvas creation + PNG export in Workers?
2. **Is there a WASM-based SVG renderer** that works in Cloudflare Workers?
3. **Can we use `resvg-wasm`** in Cloudflare Workers? What's the bundle size impact?
4. **If we generate silhouettes as pure SVG** (no PNG conversion), can Scenario.com's img2img API accept SVG input?
5. **What's the performance** of WASM-based solutions vs Sharp (for reference)?

## Success Criteria

A successful solution will:
- [ ] Run in Cloudflare Workers without errors
- [ ] Generate PNG silhouettes identical to current Sharp output
- [ ] Have reasonable bundle size (< 2MB for WASM is acceptable)
- [ ] Not require browser APIs (document, window, CanvasRenderingContext2D)
- [ ] Allow our test suite to run without `node:child_process` errors

## Files to Modify

Once a solution is found:
- `api/src/ai/pipeline/silhouettes/ui-component.ts` - Replace Sharp canvas/compositing
- `api/src/ai/pipeline/silhouettes/ui-component-svg.ts` - Replace Sharp SVG→PNG
- `api/package.json` - Remove `sharp`, add replacement
- `api/vitest.config.ts` - May need WASM configuration

## Reference: What Works Without Sharp

Note: Our core entity silhouette generation (`api/src/ai/assets.ts`) already works WITHOUT Sharp using pure pixel manipulation + a simple PNG encoder. The approach:

```typescript
// This already works - no Sharp needed
function createSilhouettePng(shape, width, height, canvasSize = 512): Uint8Array {
  const pixels = new Uint8Array(canvasSize * canvasSize * 3);
  pixels.fill(255); // White background
  
  // Draw black shape via pixel manipulation
  for (let py = 0; py < canvasSize; py++) {
    for (let px = 0; px < canvasSize; px++) {
      if (isInsideShape(px, py, shape, ...)) {
        const idx = (py * canvasSize + px) * 3;
        pixels[idx] = 0;     // R
        pixels[idx + 1] = 0; // G  
        pixels[idx + 2] = 0; // B
      }
    }
  }
  
  return encodePng(pixels, canvasSize, canvasSize);
}
```

We could potentially extend this approach if we can find a good SVG→pixels solution.
