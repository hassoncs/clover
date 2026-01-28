# 3D Scene Example (Godot SubViewport Overlay)

## TL;DR

Add a new Examples-page entry that initializes the existing Godot bridge, loads the Khronos **Duck.glb** via `show3DModelFromUrl`, and provides simple **X/Y/Z rotation controls** that call `rotate3DModel(xDeg, yDeg, zDeg)`.

**Deliverables**
- `app/app/examples/three_d_scene.tsx` (new example page)
- Registry updated via existing generator (auto via watcher, or `pnpm registry` / `pnpm --filter slopcade generate:registry`)

**Estimated Effort**: Short
**Parallel Execution**: NO (single feature slice)
**Critical Path**: Create example → verify on Examples page → manual QA

---

## Context

### Original Request
Create a single example on the examples page that demonstrates **3D Godot rendering** using the existing **SubViewport overlay** pipeline, loads a 3D model (Duck GLB), and provides **basic interaction** (rotation controls).

### Verified Existing Capabilities (references)

**Example pattern (bridge + view + initialize):**
- `app/app/examples/glb_viewer.tsx` (lines ~14–153)
  - Demonstrates: dynamic import of `@/lib/godot`, `createGodotBridge()`, `bridge.initialize()`, render `<GodotView style={{ flex: 1 }} />`.
  - Demonstrates: `bridge.show3DModelFromUrl("https://raw.githubusercontent.com/.../Duck.glb")`.

**Bridge API exists (web + native):**
- `app/lib/godot/GodotBridge.web.ts` (around lines ~1204–1237)
  - `show3DModelFromUrl(url)` → calls `godotBridge?.show_3d_model_from_url?.(url)`.
  - `set3DViewportSize(width,height)`, `rotate3DModel(x,y,z)`, `set3DCameraDistance(distance)`, `clear3DModels()`.
- `app/lib/godot/GodotBridge.native.ts` (around lines ~1257–1284)
  - Same methods forwarded to `GameBridge` via `callGameBridge`.

**Godot 3D rendering path is already implemented:**
- `godot_project/scripts/3d/Viewport3D.gd` (entire file)
  - Creates `SubViewport` + `Camera3D` + lights + environment, and displays it via a `Sprite2D`.
  - `set_viewport_size(width,height)`.
  - `set_model_rotation(rotation_deg: Vector3)` uses `rotation_degrees`.
  - `load_glb_async(url)` loads remote GLB.
- `godot_project/scripts/GameBridge.gd`
  - Creates `_viewport_3d = Viewport3D.new()` in `_init_modules()` (around lines ~128–134).
  - Exposes JS-callable methods:
    - `show_3d_model_from_url(url)` (around lines ~3785–3790)
    - `set_3d_viewport_size(width,height)` (around lines ~3795–3798)
    - `rotate_3d_model(x,y,z)` (around lines ~3799–3802)
    - `clear_3d_models()` (around lines ~3807–3810)

---

## Work Objectives

### Core Objective
Create a new example page that demonstrates **3D model rendering** in Godot via the existing SubViewport overlay, plus **interactive rotation controls**.

### Concrete Deliverables
- New file: `app/app/examples/three_d_scene.tsx`
  - `export const metadata` (auto-discovery)
  - Default export React component that:
    - Initializes Godot bridge
    - Renders `<GodotView />`
    - Loads Duck GLB via `show3DModelFromUrl`
    - Provides rotation UI calling `rotate3DModel(xDeg, yDeg, zDeg)`
    - Cleans up on unmount: `clear3DModels()` (and optionally reset rotation)

### Definition of Done
- The Examples list shows a new entry titled something like **“3D Scene”** (or similar).
- Opening it renders Godot content and loads the Duck GLB.
- Adjusting rotation controls visibly rotates the model.
- No Godot project changes required.

### Guardrails (Must NOT)
- Do **not** switch `Main.tscn` or change the Godot boot flow.
- Do **not** add a 2D background/game definition (keep it 3D-focused).
- Do **not** introduce new dependencies (use existing `@react-native-community/slider` or an existing in-repo slider component).

---

## Verification Strategy

### Test Decision
- **Existing test infra**: YES (repo uses TypeScript + vitest). This change is UI/example-focused; prioritize **manual verification** + **typecheck**.

### Manual QA (required)
- Verify on at least **web** (and optionally native if part of your usual workflow).

---

## Execution Strategy

### Wave 1 (Single Wave)
1) Implement the new example page file
2) Ensure registry discovers it
3) Manual verification

---

## TODOs

- [ ] 1. Create new example `three_d_scene.tsx` with bridge init + Duck load

  **What to do**:
  - Create `app/app/examples/three_d_scene.tsx`.
  - Follow the initialization pattern from `glb_viewer.tsx`:
    - Dynamic import `@/lib/godot` (keeps bundle smaller and matches examples).
    - `const bridge = await createGodotBridge(); await bridge.initialize();`
    - Render `<GodotView style={{ flex: 1 }} />`.
  - When bridge becomes ready:
    - Call `bridge.show3DModelFromUrl(DUCK_URL)`.
  - Implement simple rotation state:
    - Maintain `rotXDeg`, `rotYDeg`, `rotZDeg` in React state.
    - On change, call `bridge.rotate3DModel(rotXDeg, rotYDeg, rotZDeg)`.
  - Add basic UI controls:
    - Use `@react-native-community/slider` (already in `app/package.json`) or reuse in-repo slider components.
    - Provide labels and a “Reset rotation” button.
  - Handle sizing:
    - On layout, call `bridge.set3DViewportSize(widthPx, heightPx)` so the 3D overlay matches the visible view.
    - (Optional) If needed, call `set3DViewportPosition(0,0)` or leave default centering.
  - Cleanup:
    - In `useEffect` cleanup, call `bridge.clear3DModels()`.

  **Exact code (drop-in example)**:
  
  Create file: `app/app/examples/three_d_scene.tsx`
  
  ```tsx
  import { useCallback, useEffect, useMemo, useState } from "react";
  import { View, Text, Pressable } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import Slider from "@react-native-community/slider";
  import { useRouter } from "expo-router";
  import type { ExampleMeta } from "@/lib/registry/types";
  import type { GodotBridge } from "@/lib/godot/types";
  import { FullScreenHeader } from "../../components/FullScreenHeader";
  
  const DUCK_GLB_URL =
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb";
  
  export const metadata: ExampleMeta = {
    title: "3D Scene",
    description: "Render a 3D GLB in Godot and rotate it (SubViewport overlay).",
  };
  
  type Status = "loading" | "ready" | "error";
  
  export default function ThreeDSceneExample() {
    const router = useRouter();
    const [bridge, setBridge] = useState<GodotBridge | null>(null);
    const [GodotView, setGodotView] = useState<React.ComponentType<{ style?: object }> | null>(null);
    const [status, setStatus] = useState<Status>("loading");
  
    const [rotX, setRotX] = useState(0);
    const [rotY, setRotY] = useState(0);
    const [rotZ, setRotZ] = useState(0);
  
    // Keep a memo for convenient display
    const rotationLabel = useMemo(
      () => `X ${rotX.toFixed(0)}°  Y ${rotY.toFixed(0)}°  Z ${rotZ.toFixed(0)}°`,
      [rotX, rotY, rotZ]
    );
  
    useEffect(() => {
      let mounted = true;
  
      import("@/lib/godot")
        .then(async (mod) => {
          if (!mounted) return;
          const newBridge = await mod.createGodotBridge();
          setBridge(newBridge);
          setGodotView(() => mod.GodotView);
        })
        .catch((err) => {
          if (!mounted) return;
          console.error("[ThreeDScene] Failed to load module:", err);
          setStatus("error");
        });
  
      return () => {
        mounted = false;
      };
    }, []);
  
    useEffect(() => {
      if (!bridge || !GodotView) return;
  
      let mounted = true;
      bridge
        .initialize()
        .then(() => {
          if (!mounted) return;
          setStatus("ready");
        })
        .catch((err) => {
          if (!mounted) return;
          console.error("[ThreeDScene] Failed to initialize:", err);
          setStatus("error");
        });
  
      return () => {
        mounted = false;
      };
    }, [bridge, GodotView]);
  
    // Load model once when ready
    useEffect(() => {
      if (status !== "ready" || !bridge) return;
      bridge.show3DModelFromUrl(DUCK_GLB_URL);
      // Give a decent default framing (optional)
      bridge.set3DCameraDistance(5);
      // Ensure we start at 0 rotation
      bridge.rotate3DModel(0, 0, 0);
  
      return () => {
        // Cleanup when leaving this screen
        bridge.clear3DModels();
      };
    }, [status, bridge]);
  
    // Apply rotation whenever it changes
    useEffect(() => {
      if (status !== "ready" || !bridge) return;
      bridge.rotate3DModel(rotX, rotY, rotZ);
    }, [status, bridge, rotX, rotY, rotZ]);
  
    const onReset = useCallback(() => {
      setRotX(0);
      setRotY(0);
      setRotZ(0);
    }, []);
  
    const onGodotLayout = useCallback(
      (e: any) => {
        if (!bridge) return;
        const { width, height } = e.nativeEvent.layout;
        // Size is in pixels; bridge expects ints
        bridge.set3DViewportSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      },
      [bridge]
    );
  
    return (
      <SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
        <FullScreenHeader
          title="3D Scene"
          rightContent={
            status === "loading" ? <Text className="text-yellow-400 text-xs">Loading...</Text> : null
          }
        />
  
        <View className="flex-1" onLayout={onGodotLayout}>
          {status === "error" ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-red-400 text-lg">Failed to load Godot</Text>
              <Pressable className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" onPress={() => router.back()}>
                <Text className="text-white font-semibold">← Go Back</Text>
              </Pressable>
            </View>
          ) : GodotView ? (
            <GodotView style={{ flex: 1 }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">Loading Godot...</Text>
            </View>
          )}
        </View>
  
        {status === "ready" && (
          <View className="bg-black/80 p-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-xs">{rotationLabel}</Text>
              <Pressable onPress={onReset} className="bg-gray-700 rounded-md px-3 py-2">
                <Text className="text-white text-xs font-semibold">Reset</Text>
              </Pressable>
            </View>
  
            <View className="gap-2">
              <View>
                <Text className="text-white text-xs mb-1">Rotate X</Text>
                <Slider minimumValue={-180} maximumValue={180} value={rotX} onValueChange={setRotX} />
              </View>
              <View>
                <Text className="text-white text-xs mb-1">Rotate Y</Text>
                <Slider minimumValue={-180} maximumValue={180} value={rotY} onValueChange={setRotY} />
              </View>
              <View>
                <Text className="text-white text-xs mb-1">Rotate Z</Text>
                <Slider minimumValue={-180} maximumValue={180} value={rotZ} onValueChange={setRotZ} />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }
  ```

  **References**:
  - `app/app/examples/glb_viewer.tsx:14-153` — exact bridge initialization + rendering pattern.
  - `app/lib/godot/GodotBridge.web.ts:1204-1237` — method names to call from web.
  - `app/lib/godot/GodotBridge.native.ts:1257-1284` — confirms the same calls work on native.
  - `godot_project/scripts/3d/Viewport3D.gd:62-103` — `set_viewport_size`, `set_model_rotation`, model container rotation is in **degrees**.
  - `godot_project/scripts/GameBridge.gd:3785-3810` — confirms `rotate_3d_model` and `show_3d_model_from_url` are implemented.

  **Acceptance Criteria**:
  - [ ] `app/app/examples/three_d_scene.tsx` exists and exports:
    - `export const metadata = { title, description }`
    - default component
  - [ ] Opening the example loads Duck GLB from:
    - `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb`
  - [ ] Rotating X/Y/Z via UI produces visible rotation.
  - [ ] Leaving the example does not leave lingering 3D models (validated by re-entering and seeing a single model).

  **Manual Execution Verification**:
  - [ ] Start dev:
    - `pnpm dev`
  - [ ] Open Examples list in the app (web or native) and verify the new example appears.
  - [ ] Open the example:
    - Expect: Godot view renders, model appears.
  - [ ] Move rotation sliders / press rotate buttons:
    - Expect: model rotates smoothly around corresponding axis.
  - [ ] Navigate back and re-open:
    - Expect: no duplicated models / no errors.

- [ ] 2. Ensure registry auto-discovers the new example

  **What to do**:
  - Confirm the file is located under `app/app/examples/` and exports `metadata`.
  - If registry watcher isn’t running, regenerate explicitly.

  **References**:
  - `app/app/examples/[id].tsx:1-45` — example route loads by registry ID.
  - `app/AGENTS.md` Registry section — explains auto-discovery via `export const metadata` and generator.
  - `app/package.json:scripts` — `generate:registry` exists; root `package.json` also has `registry` / `registry:watch`.

  **Acceptance Criteria**:
  - [ ] `app/lib/registry/generated/examples.ts` contains the new entry after generation (or watcher update).
  - [ ] `pnpm registry:check` (or `pnpm --filter slopcade generate:registry:check`) passes.

- [ ] 3. Optional polish: camera distance preset + reset button

  **What to do**:
  - Add a simple “Zoom” slider or preset buttons calling `bridge.set3DCameraDistance(distance)`.
  - Default to a good-looking value on load.

  **References**:
  - `app/lib/godot/GodotBridge.*.ts` — `set3DCameraDistance` exists.
  - `godot_project/scripts/3d/Viewport3D.gd:98-103` — camera `position.z` is used as distance.

  **Acceptance Criteria**:
  - [ ] Adjusting camera distance changes perceived model size framing.

---

## Godot Project Changes

**None required** for the simplest working solution.

Rationale: `GameBridge.gd` already instantiates `Viewport3D`, and `show_3d_model_from_url` + `rotate_3d_model` already work end-to-end.

---

## Build / Verification Steps

1) Ensure services are up:
```bash
pnpm dev
```

2) If the registry watcher didn’t pick up the new file, regenerate:
```bash
pnpm registry
# or
pnpm --filter slopcade generate:registry
```

3) Typecheck (recommended):
```bash
pnpm --filter slopcade tsc --noEmit
```

4) Run the app (choose one):
```bash
pnpm web
# or
pnpm ios
# or
pnpm android
```

5) Manual QA per Task 1 acceptance criteria.
