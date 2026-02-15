# Three.js → Godot: Interactive Playground Analysis

> **Goal**: Catalog Three.js's 564 examples, identify the most compelling interactive toys/playgrounds/gizmos, and prioritize what to build as Slopcade 3D experiences — assuming full TypeScript→Godot 3D scripting control.

---

## Table of Contents

1. [Three.js Example Catalog Summary](#catalog)
2. [Top 25 Playground Candidates](#top-25)
3. [API Surface Required](#api-surface)
4. [Priority Build List: 20 Experiences](#build-list)
5. [Effort Tiers](#effort-tiers)
6. [Godot API Mapping Quick Reference](#godot-mapping)

---

<a name="catalog"></a>
## 1. Three.js Example Catalog Summary

564 total examples across these categories:

| Category | Count | What's In It |
|----------|-------|-------------|
| **webgl** (core) | ~220 | Animation, cameras, geometries, interactive, lighting, loaders, materials, morphtargets, panoramas, particles, portals, raycasting, shaders, shadows, sprites |
| **webgl / postprocessing** | 27 | Bloom, DOF/bokeh, glitch, godrays, halftone, masking, outline, pixel, SSAO, SSR, sobel edge detect |
| **webgl / advanced** | 49 | BufferGeometry, custom attributes, GPGPU (birds, water, protoplanet), compute, volume rendering, shadows (CSM, PCSS) |
| **webgpu (wip)** | ~170 | Modern ports of above + TSL shader language, compute particles (rain/snow/fluid/cloth), caustics, ocean, procedural terrain, VFX (flames, tornado, linked particles) |
| **physics** | 12 | Ammo.js (break, cloth, rope, terrain, volume), Rapier (basic, joints, character controller, vehicle), Jolt |
| **misc** | 16 | All the CONTROLS (orbit, fly, drag, map, pointerlock, trackball, transform, arcball), exporters, animation tools |
| **webaudio** | 4 | Spatial audio orientation, sandbox, timing, visualizer |
| **webxr** | 20 | AR (hit test, plane detect), VR (hand input, teleport, paint, sculpt, rollercoaster) |
| **css2d/css3d** | 8 | HTML overlays in 3D space (molecules, periodic table, YouTube embeds) |
| **games** | 1 | FPS with octree collisions, WASD+mouse, ball throwing |

### Most Relevant Categories for Slopcade Playgrounds

**High relevance** (directly translatable to interactive toys):
- `webgl` interactive examples (cubes, points, voxelpainter, buffergeometry)
- `webgl` shader/visual examples (lava, ocean, sky, waves, marching cubes)
- `webgl / postprocessing` (bloom, glitch, pixel, afterimage trails)
- `webgl / advanced` GPGPU (birds flock, water sim, protoplanet)
- `physics` (Rapier basic, joints, character controller, cloth, breakable)
- `misc` controls (orbit, drag, transform — essential for all 3D toys)
- `webgpu` compute particles (rain, snow, fluid, cloth) and VFX (flames, tornado)
- `webgpu` TSL procedural (terrain, galaxy, earth, raging sea, wood)

**Medium relevance** (cool but more specialized):
- `webgl` loaders (GLTF viewer, model inspection)
- `webgl` materials (car paint, toon, video textures, clearcoat)
- `webgl` morphtargets (face, webcam)
- `webaudio` (spatial audio sandbox)

**Low relevance for now** (platform-specific or niche):
- `webxr` (requires AR/VR hardware)
- `css2d/css3d` (HTML-in-3D, doesn't map to Godot)
- Most loaders for obscure formats (3dm, 3ds, ifc, etc.)

---

<a name="top-25"></a>
## 2. Top 25 Playground Candidates (from Three.js Examples)

These are the Three.js examples that most naturally become **interactive toys / visual playgrounds / satisfying gizmos** in Slopcade. Scored on: visual wow factor, interactivity depth, "fun knob" potential, and Godot feasibility.

### Tier S — "Must Build" (Iconic showcases)

| # | Three.js Example | What It Is | Why It's Perfect |
|---|-----------------|-----------|-----------------|
| 1 | `webgl_interactive_voxelpainter` | Click to place/remove colored voxels on a grid | **Minecraft creative mode in miniature.** Pure creation toy. Orbit camera + click = hours of fun. Kids love it. |
| 2 | `webgl_gpgpu_water` | Interactive water surface — click/drag to create ripples | **Mesmerizing physics toy.** Touch the water, watch it ripple. Add objects that bob. Universally satisfying. |
| 3 | `webgl_gpgpu_birds` | Flocking simulation — hundreds of birds follow cursor | **Emergent behavior playground.** Tweak flock size, separation, alignment, cohesion. Watch patterns emerge. |
| 4 | `webgl_points_waves` | 2500 dots form a sine wave surface, mouse controls camera | **Ambient zen toy.** Adjust wave frequency, amplitude, speed, colors. Screensaver-meets-playground. |
| 5 | `physics_rapier_basic` | Boxes/spheres drop onto a floor with real physics | **The quintessential physics sandbox.** Tap to spawn shapes. Adjust gravity, bounce, friction. Endlessly satisfying. |

### Tier A — "High Impact" (Strong showcases with great interactivity)

| # | Three.js Example | What It Is | Why It's Perfect |
|---|-----------------|-----------|-----------------|
| 6 | `webgl_geometry_terrain` | Perlin noise terrain with fog, fly-over camera | **Procedural world explorer.** Regenerate terrain, adjust noise params, fly through it. Great "wow, I made that" feel. |
| 7 | `webgl_shaders_ocean` | Realistic animated ocean with sky reflection | **Meditative water toy.** Adjust wave height, choppiness, wind direction, sun position. Stare at it forever. |
| 8 | `webgl_marchingcubes` | Blobby metaballs that merge and split in real-time | **Satisfying blob playground.** Drag blobs around, watch them merge. Adjust resolution, speed, material. Lava lamp vibes. |
| 9 | `webgl_shader_lava` | Animated lava shader on a torus | **Shader art toy.** Tweak color, speed, turbulence, scale. Rotate the object. Hypnotic. |
| 10 | `games_fps` | First-person walker with ball throwing in a GLTF world | **3D exploration playground.** WASD + mouse look + throw balls. Proves "you can build a real 3D game here." |
| 11 | `webgl_geometry_minecraft` | Perlin noise voxel world with first-person fly-through | **Minecraft landscape generator.** Fly through procedurally generated blocky terrain. Adjust world params. |
| 12 | `webgl_interactive_cubes` | Grid of cubes that highlight on hover/raycast | **3D interaction demo.** Hover = highlight. Click = action. Foundation for any 3D puzzle or picker. |
| 13 | `physics_rapier_joints` | Connected physics bodies with various joint types | **Joint playground.** Drag things around, watch chains react. Adjust joint stiffness, limits. Ragdoll vibes. |
| 14 | `webgl_postprocessing_unreal_bloom` | Glowing neon objects with bloom post-processing | **Neon art studio.** Place glowing objects, adjust bloom intensity/threshold/radius. Instant vaporwave. |
| 15 | `webgl_decals` | Shoot decals (splats/marks) onto 3D surfaces | **Paintball / graffiti toy.** Click to splat. Change colors, sizes, rotation. Tag a 3D model. |

### Tier B — "Great Additions" (Unique mechanics, slightly more effort)

| # | Three.js Example | What It Is | Why It's Perfect |
|---|-----------------|-----------|-----------------|
| 16 | `webgl_gpgpu_protoplanet` | Gravitational particle simulation forming a planet | **Space toy.** Fling particles, watch gravity pull them into a protoplanet. Adjust mass, particle count. |
| 17 | `webgpu_compute_particles_rain` | GPU particle rain with ground collision | **Weather playground.** Adjust rain intensity, wind, drop size. Add snow mode. Oddly calming. |
| 18 | `webgl_shaders_sky` | Physically-based sky with sun position control | **Sky painter.** Drag the sun around, watch the sky change — sunrise, sunset, noon, twilight. Real Rayleigh scattering. |
| 19 | `physics_ammo_cloth` | Cloth simulation draped over objects | **Fabric toy.** Drop cloth on objects. Adjust wind, stiffness, gravity. Poke it. |
| 20 | `webgl_geometry_csg` | Constructive Solid Geometry — boolean operations on shapes | **3D sculpting toy.** Union, subtract, intersect shapes. Build weird objects from primitives. |
| 21 | `webgl_mirror` | Reflective floor/surfaces with real-time reflection | **Mirror world.** Place reflective surfaces, see the scene reflected. Adjust roughness, tint. |
| 22 | `webgpu_tsl_vfx_flames` | Realistic fire VFX using TSL shader nodes | **Fire playground.** Adjust flame height, spread, color, turbulence. Place fires around a scene. |
| 23 | `webgl_postprocessing_glitch` | Screen glitch/distortion effects | **Glitch art studio.** Toggle glitch modes, adjust intensity. Apply to any scene for instant digital chaos. |
| 24 | `webgl_geometry_spline_editor` | Interactive spline curve editor — drag control points | **Path builder.** Drag points to shape 3D curves. Extrude tubes along them. Foundation for rollercoaster/track builders. |
| 25 | `webgl_postprocessing_pixel` | Pixelation post-processing effect | **Retro filter playground.** Adjust pixel size, combine with other effects. Instant PS1/retro aesthetic. |

### Honorable Mentions (Cool but higher effort or narrower appeal)

- `webgl_animation_keyframes` — Animated GLTF model viewer (good for showcasing imported models)
- `webgl_materials_car` — Realistic car paint materials with environment reflections
- `webgl_lensflares` — Lens flare effects (fun for photo-mode toys)
- `webgl_morphtargets_face` — Face morphing/expression editor
- `webgl_panorama_equirectangular` — 360° panorama viewer
- `webgl_video_panorama_equirectangular` — 360° video viewer
- `webgl_portal` — Portal rendering (see through to another scene)
- `webgpu_tsl_galaxy` — Procedural galaxy generator
- `webgpu_tsl_earth` — Procedural earth with atmosphere
- `webgpu_compute_cloth` — GPU cloth simulation
- `webgpu_ocean` — Modern ocean renderer
- `webgpu_tsl_raging_sea` — Stylized stormy sea
- `physics_ammo_break` — Breakable objects (smash things!)
- `physics_rapier_vehicle_controller` — Driveable vehicle
- `physics_rapier_character_controller` — Walk around a 3D world
- `misc_controls_transform` — Gizmo handles for translate/rotate/scale (THE editor gizmo)
- `webgl_effects_ascii` — ASCII art renderer (convert any 3D scene to text art)
- `webaudio_visualizer` — Audio visualization in 3D

---

<a name="api-surface"></a>
## 3. API Surface Required

To build the top 20 experiences, we need these Godot APIs exposed through the scripting bridge. Grouped by what they unlock.

### Wave 1: Foundation (unlocks experiences #1-5, #10, #12)

These are the absolute basics — without these, nothing 3D works.

| API Area | Godot Classes | Bridge Methods Needed | What It Unlocks |
|----------|--------------|----------------------|----------------|
| **3D Node Creation** | `Node3D`, `MeshInstance3D` | `create3DNode(type, opts)`, `setTransform3D(id, pos, rot, scale)` | Everything. Every 3D experience starts here. |
| **Primitive Meshes** | `BoxMesh`, `SphereMesh`, `PlaneMesh`, `CylinderMesh` | `setPrimitiveMesh(id, type, params)` | Voxelpainter, physics sandbox, interactive cubes |
| **Basic Materials** | `StandardMaterial3D` | `setMaterial3D(id, {color, metallic, roughness, emission})` | Colored objects, glowing objects, basic look |
| **Camera Control** | `Camera3D` | `setCamera3D(projection, fov, near, far)`, `setCameraTransform(pos, lookAt)` | Every experience needs a camera |
| **Orbit Controls** | Script-based (pivot Node3D + SpringArm3D) | `enableOrbitControls(target, distance, minDist, maxDist)` | Inspect/rotate objects. Core interaction pattern. |
| **Raycasting** | `PhysicsDirectSpaceState3D` | `raycast3D(from, to)` → `{hit, point, normal, entityId}` | Click-to-interact (#1, #12, #15) |
| **Lighting** | `DirectionalLight3D`, `OmniLight3D` | `createLight(type, {color, energy, shadows})` | Everything needs light |
| **Environment** | `WorldEnvironment`, `Environment` | `setEnvironment({bg, ambient, tonemap})` | Sky color, ambient light, tone mapping |

### Wave 2: Physics + Dynamics (unlocks #5, #10, #13, #19)

| API Area | Godot Classes | Bridge Methods Needed | What It Unlocks |
|----------|--------------|----------------------|----------------|
| **3D Physics Bodies** | `RigidBody3D`, `StaticBody3D` | `create3DBody(type, {mass, restitution, friction})` | Physics sandbox, FPS ball throwing |
| **3D Collision Shapes** | `CollisionShape3D` + shape resources | `setCollisionShape3D(bodyId, shapeType, params)` | Hit detection for all physics toys |
| **Forces/Impulses** | `RigidBody3D` methods | `applyImpulse3D(id, impulse)`, `applyForce3D(id, force)` | Throw balls, push objects |
| **3D Joints** | `Generic6DOFJoint3D`, `HingeJoint3D`, etc. | `createJoint3D(type, bodyA, bodyB, params)` | Joint playground, ragdolls, chains |
| **Character Controller** | `CharacterBody3D` | `moveAndSlide3D(id, velocity)` | FPS walker, exploration |

### Wave 3: Visual Wow (unlocks #2, #7, #8, #9, #14, #18, #22)

| API Area | Godot Classes | Bridge Methods Needed | What It Unlocks |
|----------|--------------|----------------------|----------------|
| **Custom Shaders** | `ShaderMaterial`, `.gdshader` | `setShaderMaterial(id, shaderCode, uniforms)` | Lava, ocean, water, custom VFX |
| **Shader Uniforms** | ShaderMaterial params | `setShaderUniform(id, name, value)` | "Knobs" — the interactive part of shader toys |
| **Post-Processing** | `Environment` effects | `setPostProcessing({bloom, ssao, ssr, fog, dof})` | Bloom (#14), glitch (#23), pixel (#25) |
| **GPU Particles** | `GPUParticles3D`, `ParticleProcessMaterial` | `createParticles3D({count, material, lifetime, ...})` | Rain, fire, snow, ambient particles |
| **Sky** | `ProceduralSkyMaterial` | `setProceduralSky({sunAngle, sunColor, skyColor})` | Sky painter (#18), day/night cycle |

### Wave 4: Advanced/Procedural (unlocks #3, #6, #11, #16, #17, #20, #24)

| API Area | Godot Classes | Bridge Methods Needed | What It Unlocks |
|----------|--------------|----------------------|----------------|
| **ArrayMesh / BufferGeometry** | `ArrayMesh`, `SurfaceTool` | `createCustomMesh(vertices, normals, uvs, indices)` | Terrain, marching cubes, procedural geometry |
| **MultiMesh Instancing** | `MultiMeshInstance3D` | `createMultiMesh(mesh, count)`, `setInstanceTransform(idx, transform)` | Flocking birds, thousands of particles as meshes |
| **Noise/Procedural** | Script-side (SimplexNoise) | Runs in QuickJS — no bridge needed | Terrain generation, procedural placement |
| **CSG** | `CSGBox3D`, `CSGSphere3D`, etc. | `createCSG(type, params)`, `csgOperation(a, b, op)` | Boolean sculpting toy |
| **Tween** | `Tween` | `tween3D(id, property, from, to, duration, easing)` | Smooth animations, camera moves, UI transitions |
| **Animation** | `AnimationPlayer` | `playAnimation(id, name)`, `loadGLTFAnimation(url)` | Animated model viewer, keyframe playback |

---

<a name="build-list"></a>
## 4. Priority Build List: 20 Experiences

Ordered by: (impact × fun) / effort. Each entry includes what makes it a "playground" (not just a demo), the core interaction loop, and the knobs users can fiddle with.

---

### Experience 1: Physics Sandbox
**Three.js ref**: `physics_rapier_basic` + `physics_rapier_joints`
**Effort**: LOW | **API Wave**: 1+2 | **Wow Factor**: ★★★★

**What**: Tap anywhere to spawn random 3D shapes (boxes, spheres, cylinders) that fall with real physics. Orbit camera to watch from any angle.

**Interaction loop**: Tap = spawn shape. Swipe = throw. Pinch = zoom. Shake = reset.

**Knobs**:
- Gravity strength + direction (tilt phone to change gravity!)
- Bounciness (restitution 0→1)
- Shape type selector
- Material (bouncy rubber, heavy metal, ice)
- Spawn rate (auto-rain mode)
- Floor tilt angle

**Godot core**: `RigidBody3D` + `CollisionShape3D` + primitive meshes + orbit camera

---

### Experience 2: Voxel Painter
**Three.js ref**: `webgl_interactive_voxelpainter`
**Effort**: LOW | **API Wave**: 1 | **Wow Factor**: ★★★★

**What**: 3D grid. Tap a face to place a colored voxel. Tap an existing voxel to remove it. Orbit to rotate your creation.

**Interaction loop**: Tap = place. Long-press = remove. Rotate view. Pick colors from palette.

**Knobs**:
- Color palette (rainbow picker)
- Voxel size
- Grid size (8×8 → 32×32)
- Material style (matte, glossy, emissive/glowing)
- Toggle grid visibility
- Screenshot/export button

**Godot core**: `MeshInstance3D` + `BoxMesh` + raycasting + orbit camera

---

### Experience 3: Wave Particle Field
**Three.js ref**: `webgl_points_waves`
**Effort**: LOW | **API Wave**: 1+3 | **Wow Factor**: ★★★★

**What**: A grid of dots/spheres undulating in sine waves. Mouse/finger position influences the wave. Mesmerizing ambient toy.

**Interaction loop**: Move finger to shift wave center. Pinch to zoom. Auto-animates.

**Knobs**:
- Wave frequency X / Y
- Wave amplitude
- Speed
- Dot size
- Color gradient (single color → rainbow)
- Dot shape (circle, square, diamond)
- Camera angle (top-down vs perspective)

**Godot core**: `MultiMeshInstance3D` (thousands of small spheres) + script-driven sine wave update per frame

---

### Experience 4: Water Ripple Surface
**Three.js ref**: `webgl_gpgpu_water`
**Effort**: MEDIUM | **API Wave**: 1+3 | **Wow Factor**: ★★★★★

**What**: A flat water surface. Touch it anywhere to create ripples that propagate and interact. Drop objects to create splashes.

**Interaction loop**: Touch = ripple. Drag = continuous disturbance. Objects bob on surface.

**Knobs**:
- Wave damping (calm lake vs responsive pool)
- Viscosity
- Drop size
- Water color/transparency
- Reflection strength
- Rain mode (random drops)

**Godot core**: Shader-driven heightmap simulation on a `PlaneMesh`. Custom `ShaderMaterial` reads previous frame via ping-pong textures. Touch input maps to UV coordinates.

---

### Experience 5: Flocking Birds
**Three.js ref**: `webgl_gpgpu_birds`
**Effort**: MEDIUM | **API Wave**: 1+4 | **Wow Factor**: ★★★★★

**What**: Hundreds of bird-like shapes swarm in 3D space, following classic boid rules. Touch to attract/repel the flock.

**Interaction loop**: Tap = attract flock to point. Hold = scatter. Orbit camera to watch from any angle.

**Knobs**:
- Flock size (10 → 500)
- Separation distance
- Alignment strength
- Cohesion strength
- Speed limit
- Predator mode (tap creates a "hawk" that scares them)
- Bird color (uniform, random, flock-based)

**Godot core**: `MultiMeshInstance3D` for rendering, boid logic in script (runs per-frame in QuickJS), or compute shader for large counts

---

### Experience 6: Neon Bloom Studio
**Three.js ref**: `webgl_postprocessing_unreal_bloom`
**Effort**: LOW | **API Wave**: 1+3 | **Wow Factor**: ★★★★

**What**: Place glowing geometric shapes in a dark scene. Everything blooms with neon light. Vaporwave aesthetic generator.

**Interaction loop**: Tap to place shapes. Drag to position. Pinch to resize. Color picker for glow color.

**Knobs**:
- Bloom intensity (subtle → blinding)
- Bloom threshold
- Bloom radius
- Background color (black, dark purple, midnight blue)
- Shape catalog (torus, icosahedron, knot, text)
- Emission intensity per object
- Camera orbit speed (turntable mode)

**Godot core**: Emissive `StandardMaterial3D` + `Environment.glow_enabled` + orbit camera

---

### Experience 7: Procedural Terrain Explorer
**Three.js ref**: `webgl_geometry_terrain` + `webgl_geometry_minecraft`
**Effort**: MEDIUM | **API Wave**: 1+4 | **Wow Factor**: ★★★★

**What**: Generate a terrain from noise. Fly through it. Regenerate with different seeds/parameters. Two modes: smooth heightmap and voxel/blocky.

**Interaction loop**: Fly-through camera (touch to steer). Sliders regenerate terrain in real-time.

**Knobs**:
- Noise octaves, frequency, amplitude
- Seed (randomize button)
- Terrain style (smooth vs blocky/minecraft)
- Color scheme (grass/dirt, snow/rock, alien)
- Fog distance
- Water level (fill below a height with water plane)
- Camera speed

**Godot core**: `ArrayMesh` built from noise function. `StandardMaterial3D` with vertex colors. `Camera3D` with fly controls.

---

### Experience 8: Ocean Playground
**Three.js ref**: `webgl_shaders_ocean` + `webgl_shaders_sky`
**Effort**: MEDIUM | **API Wave**: 1+3 | **Wow Factor**: ★★★★★

**What**: A realistic ocean stretching to the horizon with animated waves and a physical sky. Drag the sun to change time of day.

**Interaction loop**: Drag sun position to change sky. Watch ocean reflect the sky. Orbit around.

**Knobs**:
- Sun elevation + azimuth (drag to move)
- Wave height / choppiness
- Wind speed / direction
- Water color (tropical turquoise → deep blue → stormy grey)
- Time of day presets (sunrise, noon, golden hour, night)
- Fog density

**Godot core**: Custom ocean shader on `PlaneMesh` + `ProceduralSkyMaterial` + `WorldEnvironment`

---

### Experience 9: Metaball Lava Lamp
**Three.js ref**: `webgl_marchingcubes`
**Effort**: MEDIUM | **API Wave**: 1+3+4 | **Wow Factor**: ★★★★

**What**: Blobby metaballs that drift, merge, and split apart. Lava lamp / organic feel.

**Interaction loop**: Touch to attract/repel blobs. Watch them merge and separate.

**Knobs**:
- Number of blobs (2 → 12)
- Blob speed
- Blob strength (merge distance)
- Resolution (low-poly chunky → smooth)
- Material (lava, chrome, toon, wireframe)
- Background color
- Auto-animate vs manual drag

**Godot core**: Marching cubes algorithm in script → `ArrayMesh` rebuilt per frame (or `ImmediateMesh`). Custom material.

---

### Experience 10: Lava Shader Toy
**Three.js ref**: `webgl_shader_lava`
**Effort**: LOW | **API Wave**: 1+3 | **Wow Factor**: ★★★★

**What**: A torus (or any shape) with an animated lava/magma shader. Hypnotic, pulsing, organic.

**Interaction loop**: Rotate object. Adjust shader parameters in real-time.

**Knobs**:
- Lava speed
- Turbulence scale
- Color (orange lava, blue plasma, green acid, purple void)
- Mesh shape (torus, sphere, knot, monkey head)
- Shader style (lava, cloud, electric, marble)
- Rotation speed

**Godot core**: `ShaderMaterial` with noise-based fragment shader + `MeshInstance3D`

---

### Experience 11: Decal Graffiti Toy
**Three.js ref**: `webgl_decals`
**Effort**: LOW | **API Wave**: 1+2 | **Wow Factor**: ★★★

**What**: A 3D model (statue, car, wall). Tap anywhere on it to splat a decal. Paint/tag it.

**Interaction loop**: Tap = splat. Pick color. Pick stamp (star, circle, skull, custom). Rotate model.

**Knobs**:
- Decal size
- Decal rotation (random or fixed)
- Color picker
- Stamp gallery
- Opacity
- Clear all button
- Model selector

**Godot core**: Raycasting to find hit point + normal → `Decal` node placed at hit. Orbit camera.

---

### Experience 12: Interactive Cube Grid
**Three.js ref**: `webgl_interactive_cubes` + `webgl_interactive_cubes_ortho`
**Effort**: LOW | **API Wave**: 1 | **Wow Factor**: ★★★

**What**: A grid of cubes. Hover/touch highlights the cube under your finger. Click to trigger effects (color change, pop up, explode, ripple).

**Interaction loop**: Hover = highlight. Tap = effect. Drag across = paint/ripple.

**Knobs**:
- Grid size (4×4 → 20×20)
- Effect type (color wave, pop-up, explode outward, domino)
- Color scheme
- Cube spacing
- Perspective vs orthographic camera

**Godot core**: Grid of `MeshInstance3D` + raycasting + `Tween` for animations

---

### Experience 13: Sky Painter
**Three.js ref**: `webgl_shaders_sky`
**Effort**: LOW | **API Wave**: 1+3 | **Wow Factor**: ★★★★

**What**: A physically-based sky. Drag the sun around to paint sunrise, noon, sunset, twilight. Real Rayleigh/Mie scattering.

**Interaction loop**: Drag sun = instant sky change. Tap presets for golden hour, blue hour, etc.

**Knobs**:
- Sun position (drag)
- Turbidity (haze)
- Rayleigh coefficient
- Mie coefficient + direction
- Time-of-day presets
- Star visibility (night mode)
- Ground plane toggle

**Godot core**: `ProceduralSkyMaterial` on `Sky` resource + `WorldEnvironment`. Most params map directly.

---

### Experience 14: Particle Rain/Snow
**Three.js ref**: `webgpu_compute_particles_rain` + `webgpu_compute_particles_snow`
**Effort**: MEDIUM | **API Wave**: 1+3 | **Wow Factor**: ★★★

**What**: GPU-accelerated rain or snow falling in a 3D scene. Particles collide with the ground and objects.

**Interaction loop**: Toggle rain/snow. Place objects to watch particles accumulate/splash.

**Knobs**:
- Precipitation type (rain, snow, cherry blossoms, confetti)
- Intensity (drizzle → downpour)
- Wind direction + strength
- Drop/flake size
- Ground accumulation toggle
- Camera: first-person "standing in it" vs orbit "viewing the scene"

**Godot core**: `GPUParticles3D` + `ParticleProcessMaterial` with gravity + collision

---

### Experience 15: FPS Ball Pit
**Three.js ref**: `games_fps`
**Effort**: MEDIUM | **API Wave**: 1+2 | **Wow Factor**: ★★★★

**What**: First-person view. Walk around a 3D environment. Click to throw bouncy balls. Watch them collide with each other and the world.

**Interaction loop**: WASD/touch-joystick to move. Tap to throw balls. Look around with touch/gyro.

**Knobs**:
- Ball bounciness
- Ball size
- Throw force (hold longer = throw harder)
- Gravity
- Ball material (rubber, bowling ball, beach ball)
- Max ball count
- Arena type (room, outdoor, zero-gravity)

**Godot core**: `CharacterBody3D` + `Camera3D` + `RigidBody3D` balls + GLTF world + Octree/collision

---

### Experience 16: Cloth Simulation
**Three.js ref**: `physics_ammo_cloth` + `webgpu_compute_cloth`
**Effort**: HIGH | **API Wave**: 2+3 | **Wow Factor**: ★★★★

**What**: A piece of cloth draped over objects. Poke it, drag it, drop objects on it. Real soft-body physics.

**Interaction loop**: Touch to poke/drag cloth. Place objects underneath. Toggle wind.

**Knobs**:
- Cloth size
- Stiffness / stretch
- Damping
- Wind strength + direction
- Pin points (which corners are held)
- Cloth texture (silk, denim, flag)

**Godot core**: `SoftBody3D` or script-based spring-mass simulation + `ArrayMesh` updated per frame

---

### Experience 17: CSG Sculptor
**Three.js ref**: `webgl_geometry_csg`
**Effort**: MEDIUM | **API Wave**: 1+4 | **Wow Factor**: ★★★

**What**: Start with a cube. Subtract, union, or intersect other shapes (spheres, cylinders, boxes) to sculpt something.

**Interaction loop**: Place a shape. Choose operation (cut, add, intersect). Apply. See result.

**Knobs**:
- Tool shape (sphere, box, cylinder, torus)
- Operation (subtract, union, intersect)
- Tool size
- Undo/redo
- Material (flat color, wireframe overlay)
- Export as mesh

**Godot core**: `CSGBox3D`, `CSGSphere3D`, etc. with `operation` property + orbit camera

---

### Experience 18: Spline Rollercoaster Builder
**Three.js ref**: `webgl_geometry_spline_editor` + `webgl_geometry_extrude_splines`
**Effort**: HIGH | **API Wave**: 1+4 | **Wow Factor**: ★★★★★

**What**: Drag control points to shape a 3D spline. A tube/track is extruded along it. A camera rides along the track.

**Interaction loop**: Drag points to shape path. Hit "ride" to fly the camera along the spline.

**Knobs**:
- Control point count
- Tube radius
- Tube segments (smooth → faceted)
- Camera ride speed
- Loop-the-loop helper
- Track material (metal, rainbow, wireframe)

**Godot core**: `Path3D` + `PathFollow3D` + `ArrayMesh` tube extrusion + `Camera3D` attached to PathFollow

---

### Experience 19: Fire VFX Playground
**Three.js ref**: `webgpu_tsl_vfx_flames` + `webgpu_particles`
**Effort**: MEDIUM | **API Wave**: 1+3 | **Wow Factor**: ★★★★

**What**: Place fire sources in a scene. Realistic flame particles. Build a campfire, a fireplace, a ring of fire.

**Interaction loop**: Tap to place a fire source. Drag to move it. Pinch to resize.

**Knobs**:
- Flame height
- Flame spread / width
- Color (orange fire, blue gas, green magic, purple soul fire)
- Spark intensity
- Smoke toggle
- Heat distortion toggle
- Scene (dark room, outdoor, cave)

**Godot core**: `GPUParticles3D` with custom particle materials + emissive light

---

### Experience 20: Protoplanet Gravity Sim
**Three.js ref**: `webgl_gpgpu_protoplanet`
**Effort**: HIGH | **API Wave**: 1+3+4 | **Wow Factor**: ★★★★★

**What**: Thousands of particles floating in space. Gravity pulls them together into a spinning protoplanet. Fling more particles to disrupt it.

**Interaction loop**: Watch formation. Swipe to fling particles. Tap to add mass.

**Knobs**:
- Gravitational constant
- Particle count (100 → 5000)
- Initial velocity distribution
- Damping (energy loss)
- Color by velocity/density
- Camera orbit speed
- Reset / seed

**Godot core**: `MultiMeshInstance3D` + N-body gravity sim in script (or compute shader). Quadtree/Barnes-Hut for perf.

---

<a name="effort-tiers"></a>
## 5. Effort Tiers

### LOW Effort (1-2 API waves, <200 lines of game script, existing Godot nodes)

| # | Experience | Primary Godot Nodes | Why It's Easy |
|---|-----------|-------------------|--------------|
| 1 | Physics Sandbox | RigidBody3D + primitives | Godot physics is built-in. Just spawn + drop. |
| 2 | Voxel Painter | MeshInstance3D + BoxMesh + raycast | Grid math + raycast. No shaders needed. |
| 3 | Wave Particle Field | MultiMeshInstance3D | Just sine math per frame on instance transforms. |
| 6 | Neon Bloom Studio | Emissive materials + Environment.glow | Most of the work is Godot's built-in bloom. |
| 10 | Lava Shader Toy | ShaderMaterial | Port a noise shader. Godot shading language is GLSL-like. |
| 11 | Decal Graffiti | Decal node + raycast | Godot has a built-in Decal node. Just place on hit. |
| 12 | Interactive Cube Grid | MeshInstance3D grid + raycast + Tween | Simple grid + hover detection. |
| 13 | Sky Painter | ProceduralSkyMaterial | Godot has built-in procedural sky. Just expose params. |

### MEDIUM Effort (2-3 API waves, 200-500 lines, some custom shaders or complex logic)

| # | Experience | Primary Challenge |
|---|-----------|------------------|
| 4 | Water Ripple Surface | Custom heightmap shader with ping-pong feedback |
| 5 | Flocking Birds | Boid algorithm for hundreds of agents, perf optimization |
| 7 | Procedural Terrain | ArrayMesh generation from noise, vertex coloring |
| 8 | Ocean Playground | Custom ocean shader (Gerstner waves) + sky integration |
| 9 | Metaball Lava Lamp | Marching cubes algorithm → dynamic mesh per frame |
| 14 | Particle Rain/Snow | GPUParticles3D tuning, ground collision |
| 15 | FPS Ball Pit | CharacterBody3D + camera rig + physics interactions |
| 17 | CSG Sculptor | CSG operation chaining, UI for tool selection |
| 19 | Fire VFX Playground | Particle material tuning, emissive lighting |

### HIGH Effort (3-4 API waves, >500 lines, compute shaders or complex simulations)

| # | Experience | Primary Challenge |
|---|-----------|------------------|
| 16 | Cloth Simulation | SoftBody3D or custom spring-mass solver |
| 18 | Spline Rollercoaster | Path3D + tube extrusion + camera animation along path |
| 20 | Protoplanet Gravity | N-body simulation, perf (Barnes-Hut), compute shaders |

---

### Build Order Recommendation

**Phase 1 — "Hello 3D World" (API Wave 1)**
Build these first to prove the 3D pipeline works end-to-end:

1. **Interactive Cube Grid** (#12) — Simplest possible 3D: grid + raycast + tween
2. **Voxel Painter** (#2) — Builds on #12, adds create/destroy
3. **Sky Painter** (#13) — Pure environment controls, no objects needed
4. **Neon Bloom Studio** (#6) — Emissive + bloom = instant visual payoff

**Phase 2 — "Physics Are Real" (API Wave 1+2)**
5. **Physics Sandbox** (#1) — The flagship demo
6. **Decal Graffiti** (#11) — Raycast + Decal proves interaction model
7. **FPS Ball Pit** (#15) — First-person proves "you can make a real game"

**Phase 3 — "Shaders Are Magic" (API Wave 1+3)**
8. **Wave Particle Field** (#3) — Shows procedural beauty
9. **Lava Shader Toy** (#10) — Shows custom shaders work
10. **Sky Painter + Ocean** (#13 + #8) — Combined = stunning environment
11. **Fire VFX** (#19) — GPU particles prove particle system works

**Phase 4 — "Advanced Toys" (API Wave 1+2+3+4)**
12. **Water Ripple Surface** (#4) — Ping-pong shader feedback
13. **Flocking Birds** (#5) — Multi-mesh + simulation
14. **Procedural Terrain** (#7) — ArrayMesh procedural generation
15. **Metaball Lava Lamp** (#9) — Marching cubes
16. **Particle Rain/Snow** (#14) — Weather system
17. **CSG Sculptor** (#17) — Boolean geometry

**Phase 5 — "Wow" (Full API surface)**
18. **Spline Rollercoaster** (#18) — Path + camera ride
19. **Cloth Simulation** (#16) — Soft body physics
20. **Protoplanet Gravity** (#20) — N-body compute

---

<a name="godot-mapping"></a>
## 6. Godot API Mapping Quick Reference

### Three.js → Godot Cheat Sheet

| Three.js Concept | Godot 4 Equivalent | Notes |
|-----------------|-------------------|-------|
| `THREE.Scene` | Scene tree root `Node3D` | Godot uses a node tree, not a flat scene container |
| `scene.add(mesh)` | `parent.add_child(node)` | Node-based hierarchy |
| `THREE.Mesh` | `MeshInstance3D` | Renders a Mesh resource |
| `THREE.BoxGeometry` | `BoxMesh` (resource) | Set on MeshInstance3D.mesh |
| `THREE.SphereGeometry` | `SphereMesh` | |
| `THREE.PlaneGeometry` | `PlaneMesh` or `QuadMesh` | |
| `THREE.CylinderGeometry` | `CylinderMesh` | |
| `THREE.TorusGeometry` | `TorusMesh` | |
| `THREE.BufferGeometry` | `ArrayMesh` + `SurfaceTool` | Manual vertex/index arrays |
| `THREE.InstancedMesh` | `MultiMeshInstance3D` | For thousands of same mesh |
| `THREE.MeshStandardMaterial` | `StandardMaterial3D` | PBR metallic/roughness |
| `THREE.MeshPhysicalMaterial` | `StandardMaterial3D` (extended) | Clearcoat, anisotropy, SSS built-in |
| `THREE.ShaderMaterial` | `ShaderMaterial` | Godot shader language (GLSL-like) |
| `THREE.PerspectiveCamera` | `Camera3D` (perspective) | |
| `THREE.OrthographicCamera` | `Camera3D` (orthogonal) | |
| `OrbitControls` | Script: pivot Node3D + SpringArm3D | No built-in, but simple to script |
| `FirstPersonControls` | `CharacterBody3D` + Camera3D | |
| `THREE.DirectionalLight` | `DirectionalLight3D` | |
| `THREE.PointLight` | `OmniLight3D` | |
| `THREE.SpotLight` | `SpotLight3D` | |
| `THREE.AmbientLight` | `Environment.ambient_light` | Via WorldEnvironment |
| `THREE.Fog` | `Environment.fog` | Also volumetric fog via FogVolume |
| `THREE.Raycaster` | `PhysicsDirectSpaceState3D.intersect_ray()` | Or `RayCast3D` node |
| `RigidBody` (Ammo/Rapier) | `RigidBody3D` | Built-in physics engine |
| `Collider` | `CollisionShape3D` | Child of physics body |
| `EffectComposer` | `Environment` + `Compositor` | Bloom/SSAO/SSR/DOF via Environment |
| `UnrealBloomPass` | `Environment.glow_enabled` | |
| `SSAOPass` | `Environment.ssao_enabled` | |
| `THREE.Points` (particles) | `GPUParticles3D` | GPU-accelerated |
| `THREE.AnimationMixer` | `AnimationPlayer` | Can animate ANY property |
| `THREE.AnimationClip` | `Animation` resource | |
| `TWEEN` | `Tween` (create_tween()) | Imperative, code-based |
| Morph targets | Blend Shapes on MeshInstance3D | |
| `CSG` library | `CSGBox3D`, `CSGSphere3D`, etc. | Built-in boolean operations |
| `Decal` projection | `Decal` node | Built-in |
| Sky (Preetham/etc.) | `ProceduralSkyMaterial` | Built-in physical sky |
| `LOD` | Automatic mesh LOD on import | |
| Occlusion culling | `OccluderInstance3D` | |

### Key Architectural Differences

1. **Scene graph**: Three.js uses flat `scene.add()`. Godot uses a strict parent→child node tree. Our bridge should abstract this with `create3DNode(type, parentId)`.

2. **Resources vs Objects**: In Three.js, you create `new BoxGeometry()` as a standalone object. In Godot, `BoxMesh` is a *Resource* set on a `MeshInstance3D` *Node*. Our API should hide this: `createBox(size)` returns an entity ID.

3. **Materials**: Three.js creates materials as objects, Godot creates them as Resources attached to mesh surfaces. Our API should handle this: `setMaterial(entityId, {color, metallic, roughness})`.

4. **Physics**: Three.js uses external physics libraries (Ammo.js, Rapier). Godot has physics BUILT IN to the engine. This is a major advantage — no extra setup.

5. **Shaders**: Three.js uses raw GLSL. Godot uses its own shader language (very similar to GLSL but with built-in lighting pipeline integration). Shaders need to be written in Godot's format, not Three.js's.

6. **Post-processing**: Three.js uses an `EffectComposer` with chained passes. Godot centralizes most post-processing in the `Environment` resource. Much simpler API surface to expose.

---

## Appendix: Full Three.js Examples Catalog

<details>
<summary>Click to expand all 564 examples</summary>

### webgl (core) — ~220 examples
**Animation**: keyframes, skinning_blending, skinning_additive_blending, skinning_ik, skinning_morph, multiple, walk
**Camera**: camera, camera_array, logarithmicdepthbuffer
**Clipping**: clipping, clipping_advanced, clipping_intersection, clipping_stencil
**Geometry**: geometries, colors, colors_lookuptable, convex, csg, cube, extrude_shapes, extrude_splines, minecraft, nurbs, shapes, spline_editor, teapot, terrain, terrain_raycast, text, text_shapes, text_stroke
**Interactive**: buffergeometry, cubes, cubes_gpu, cubes_ortho, lines, points, raycasting_points, voxelpainter
**Lighting**: lensflares, lightprobe, lightprobe_cubecamera, lights_hemisphere, lights_physical, lights_spotlight, lights_spotlights, lights_rectarealight
**Lines**: colors, dashed, fat, fat_raycasting, fat_wireframe
**Loaders**: 3dm, 3ds, 3dtiles, 3mf, amf, bvh, collada, draco, fbx, gcode, gltf (many variants), ifc, imagebitmap, kmz, ldraw, lwo, md2, mdd, nrrd, obj, pcd, pdb, ply, stl, svg, texture_*, ttf, usdz, vox, vrml, vtk, xyz
**Materials**: alphahash, blending, bumpmap, car, channels, cubemap (many), displacementmap, envmaps (many), matcap, normalmap, physical_clearcoat, physical_transmission, subsurface_scattering, texture_*, toon, video, video_webcam, wireframe
**Misc**: batch_lod_bvh, decals, depth_texture, effects_*, framebuffer_texture, helpers, instancing_*, lod, marchingcubes, mesh_batch, mirror, modifier_*, morphtargets_*, multiple_*, panorama_*, points_*, portal, random_uv, raycaster_*, read_float_buffer, renderer_pathtracer, refraction, rtt, shader, shader_lava, shaders_ocean, shaders_sky, shadow*, sprites, test_*, tonemapping, video_*, watch

### webgl / postprocessing — 27 examples
postprocessing, 3dlut, advanced, afterimage, backgrounds, transition, dof, dof2, fxaa, glitch, godrays, gtao, rgb_halftone, masking, material_ao, ssaa, outline, pixel, procedural, sao, smaa, sobel, ssao, ssr, taa, unreal_bloom, unreal_bloom_selective

### webgl / advanced — 49 examples
buffergeometry (many variants), clipculldistance, custom_attributes (many), gpgpu_birds, gpgpu_birds_gltf, gpgpu_water, gpgpu_protoplanet, materials_modified, multiple_rendertargets, multisampled_renderbuffers, rendertarget_texture2darray, reversed_depth_buffer, shadowmap_csm, shadowmap_pcss, shadowmap_progressive, simple_gi, texture2darray, texture3d, ubo, volume_cloud, volume_instancing, volume_perlin, worker_offscreencanvas, performance

### webgpu — ~170 examples
(TSL shader language, compute particles, caustics, ocean, procedural terrain, galaxy, earth, flames, tornado, linked particles, and modern ports of most webgl examples)

### physics — 12 examples
ammo_break, ammo_cloth, ammo_instancing, ammo_rope, ammo_terrain, ammo_volume, jolt_instancing, rapier_basic, rapier_instancing, rapier_joints, rapier_character_controller, rapier_vehicle_controller, rapier_terrain

### misc — 16 examples
animation_groups, animation_keys, boxselection, controls_arcball, controls_drag, controls_fly, controls_map, controls_orbit, controls_pointerlock, controls_trackball, controls_transform, exporter_*, raycaster_helper

### Other (webaudio: 4, webxr: 20, css2d: 1, css3d: 7, svg: 2, games: 1, tests: 2)

</details>
