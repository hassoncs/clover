# React Bits Shader Inventory

**Source**: `~/Workspaces/react-bits` (commit `ac204000`, branch `main`)
**Scanned**: 2026-02-15

## Summary

- **Total shader-bearing files**: 43 files across 4 content directories
- **Backgrounds**: 36 components (most shader-rich)
- **Animations**: 28 components
- **Components**: 3 with shaders (InfiniteMenu, FlyingPosters, CircularGallery)
- **TextAnimations**: 1 (ASCIIText)

## Backgrounds (shader-bearing components)

| Component | File | Shader Type | Framework | Complexity | Notes |
|-----------|------|-------------|-----------|------------|-------|
| Aurora | `Backgrounds/Aurora/Aurora.jsx` | Fragment | Three.js shaderMaterial | Medium | Standalone aurora effect |
| Balatro | `Backgrounds/Balatro/Balatro.jsx` | Fragment | Three.js shaderMaterial | Medium | Playing card holographic effect |
| Ballpit | `Backgrounds/Ballpit/Ballpit.jsx` | Material override | Three.js onBeforeCompile | High | Subsurface scattering on spheres |
| Beams | `Backgrounds/Beams/Beams.jsx` | Material patches | Three.js physical material | High | Shader chunk replacement |
| ColorBends | `Backgrounds/ColorBends/ColorBends.jsx` | Fragment | Three.js shaderMaterial | Low | Color gradient bends |
| DarkVeil | `Backgrounds/DarkVeil/DarkVeil.jsx` | Fragment | Three.js shaderMaterial | Medium | Dark atmospheric veil effect |
| Dither | `Backgrounds/Dither/Dither.jsx` | Fragment | Three.js shaderMaterial | Medium | Dithering pattern effect |
| FaultyTerminal | `Backgrounds/FaultyTerminal/FaultyTerminal.jsx` | Fragment | Three.js shaderMaterial | Medium | Terminal glitch text effect |
| FloatingLines | `Backgrounds/FloatingLines/FloatingLines.jsx` | Fragment | Raw WebGL | Medium | Animated floating lines |
| Galaxy | `Backgrounds/Galaxy/Galaxy.jsx` | Fragment | Three.js shaderMaterial | Medium | Galaxy/star field effect |
| GradientBlinds | `Backgrounds/GradientBlinds/GradientBlinds.jsx` | Fragment | Three.js shaderMaterial | Medium | Gradient blind transition |
| Grainient | `Backgrounds/Grainient/Grainient.jsx` | Fragment | WebGL2 (#version 300 es) | Medium | Grainy gradient effect |
| GridDistortion | `Backgrounds/GridDistortion/GridDistortion.jsx` | Fragment | Three.js shaderMaterial | Low | Grid distortion with texture |
| GridScan | `Backgrounds/GridScan/GridScan.jsx` | Fragment | Raw WebGL | High | Complex grid scan animation |
| Hyperspeed | `Backgrounds/Hyperspeed/Hyperspeed.jsx` | Multiple | Three.js complex scene | Very High | Road, car lights, fog - multi-shader |
| Iridescence | `Backgrounds/Iridescence/Iridescence.jsx` | Fragment | Three.js shaderMaterial | Low | Simple iridescent color shift |
| LightPillar | `Backgrounds/LightPillar/LightPillar.jsx` | Fragment | Three.js shaderMaterial | Medium | Light pillar/beam effect |
| LightRays | `Backgrounds/LightRays/LightRays.jsx` | Fragment | Three.js shaderMaterial | Medium | Volumetric light rays |
| Lightning | `Backgrounds/Lightning/Lightning.jsx` | Fragment | Raw WebGL | Medium | Lightning bolt procedural |
| LiquidChrome | `Backgrounds/LiquidChrome/LiquidChrome.jsx` | Fragment | Three.js shaderMaterial | Low | Chrome liquid distortion |
| LiquidEther | `Backgrounds/LiquidEther/LiquidEther.jsx` | Multiple (8+) | Raw WebGL fluid sim | Very High | Full Navier-Stokes fluid simulation |
| Orb | `Backgrounds/Orb/Orb.jsx` | Fragment | Three.js shaderMaterial | Medium | Glowing orb SDF effect |
| Particles | `Backgrounds/Particles/Particles.jsx` | Vertex+Fragment | Three.js custom | Medium | Particle system with color |
| PixelBlast | `Backgrounds/PixelBlast/PixelBlast.jsx` | Fragment + PP | postprocessing + Three.js | High | Pixel explosion effect |
| PixelSnow | `Backgrounds/PixelSnow/PixelSnow.jsx` | Fragment | Raw WebGL | Medium | Pixel snow falling effect |
| Plasma | `Backgrounds/Plasma/Plasma.jsx` | Fragment | WebGL2 (#version 300 es) | Medium | Plasma color flow |
| Prism | `Backgrounds/Prism/Prism.jsx` | Fragment | WebGL2 (#version 300 es) | Medium | Prismatic refraction |
| PrismaticBurst | `Backgrounds/PrismaticBurst/PrismaticBurst.jsx` | Fragment | WebGL2 (#version 300 es) | High | Complex prismatic burst |
| RippleGrid | `Backgrounds/RippleGrid/RippleGrid.jsx` | Fragment | OGL library | Medium | Ripple grid animation |
| Silk | `Backgrounds/Silk/Silk.jsx` | Fragment | Three.js shaderMaterial | Low | Silk fabric flow effect |
| Threads | `Backgrounds/Threads/Threads.jsx` | Fragment | Three.js shaderMaterial | Medium | Thread-like pattern |

## Animations (shader-bearing components)

| Component | File | Shader Type | Framework | Complexity | Notes |
|-----------|------|-------------|-----------|------------|-------|
| GhostCursor | `Animations/GhostCursor/GhostCursor.jsx` | Multiple | Three.js complex | High | Multiple shader programs |
| LaserFlow | `Animations/LaserFlow/LaserFlow.jsx` | Fragment | Three.js shaderMaterial | Medium | Laser beam flow |
| MetaBalls | `Animations/MetaBalls/MetaBalls.jsx` | Fragment | WebGL2 | Medium | Metaball SDF rendering |
| MetallicPaint | `Animations/MetallicPaint/MetallicPaint.jsx` | Fragment | Raw WebGL | Medium | Metallic paint surface |
| PixelTrail | `Animations/PixelTrail/PixelTrail.jsx` | Fragment | drei shaderMaterial | Low | Pixel trail cursor effect |
| Ribbons | `Animations/Ribbons/Ribbons.jsx` | Fragment | WebGL2 | Low | Ribbon strip animation |
| ShapeBlur | `Animations/ShapeBlur/ShapeBlur.jsx` | Fragment | Three.js shaderMaterial | Medium | Shape blur transition |
| SplashCursor | `Animations/SplashCursor/SplashCursor.jsx` | Multiple (10+) | Raw WebGL fluid sim | Very High | Full fluid simulation cursor effect |

## Components (shader-bearing)

| Component | File | Shader Type | Framework | Complexity | Notes |
|-----------|------|-------------|-----------|------------|-------|
| CircularGallery | `Components/CircularGallery/CircularGallery.jsx` | Fragment | OGL library | Medium | Circular image gallery |
| FlyingPosters | `Components/FlyingPosters/FlyingPosters.jsx` | Fragment | OGL library | Medium | Flying poster animation |
| InfiniteMenu | `Components/InfiniteMenu/InfiniteMenu.jsx` | Fragment | Raw WebGL | High | Infinite scrolling menu |

## TextAnimations (shader-bearing)

| Component | File | Shader Type | Framework | Complexity | Notes |
|-----------|------|-------------|-----------|------------|-------|
| ASCIIText | `TextAnimations/ASCIIText/ASCIIText.jsx` | Fragment | Three.js shaderMaterial | Medium | ASCII art text rendering |

## Non-shader Backgrounds (no GLSL)

- DotGrid, GridMotion, LetterGlitch, Squares, Waves

## Key Observations

1. **GLSL Dialect**: All shaders use WebGL GLSL (`gl_FragColor`, `void main()`, `gl_FragCoord`). Some use `#version 300 es` (WebGL2).
2. **Uniform naming**: Common patterns: `uTime`, `uResolution`, `uMouse`, `iTime`, `iResolution`
3. **Framework dependencies**: Many use Three.js, some use OGL, some use raw WebGL context
4. **Portability**: Standalone fragment shaders (without vertex shader dependencies or external textures) are easiest to port
5. **Complexity tiers**:
   - **Easy** (standalone fullscreen fragment): Iridescence, LiquidChrome, ColorBends, Silk, Aurora, Balatro, Galaxy, Threads, Lightning, DarkVeil, LightPillar, LightRays, PixelSnow, Orb
   - **Medium** (need uniform remapping): Grainient, Plasma, Prism, Dither, FaultyTerminal, FloatingLines, GradientBlinds, MetaBalls, MetallicPaint, ShapeBlur, LaserFlow
   - **Hard** (multi-pass, external deps, complex geometry): Hyperspeed, LiquidEther, SplashCursor, Ballpit, Beams, PixelBlast, GhostCursor, GridScan, PrismaticBurst, RippleGrid
