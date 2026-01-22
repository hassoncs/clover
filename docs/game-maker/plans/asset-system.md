# Asset System & Rendering Plan

## Overview
This document outlines the plan for implementing the Asset System, including AI-driven asset generation, Asset Packs, and Debug Rendering modes.

## 1. Debug Rendering Modes
We need to visualize game entities in different ways for debugging and development.

### Modes
1.  **Normal**: Render full assets (images, sprites).
2.  **Primitives**: Ignore image assets; render underlying physics shapes (rects, circles, polygons) with basic colors.
3.  **Debug/BoundingBox**: Draw physics colliders (fixtures) and AABBs over the entities.

### Implementation Details
-   **Component**: `GameRuntime`
-   **State**: Add `debugMode` ('none' | 'primitives' | 'wireframe') to `GameRuntime` props and internal state.
-   **Renderer**: Update `EntityRenderer` to accept `debugMode`.
    -   If `primitives`: Force fallback to `RectRenderer`/`CircleRenderer` even if `sprite.type === 'image'`.
    -   If `wireframe`: Render the entity normally, then draw a stroke outline on top.

## 2. Asset Data Structure (Asset Packs)
Decouple visual assets from game logic to allow "skinning" and swapping themes.

### Schema Changes
-   **AssetPack**: A mapping of `entityTemplateId` -> `AssetConfig`.
-   **GameDefinition**: Add `assetPacks: Record<string, AssetPack>` and `activeAssetPackId?: string`.

```typescript
type AssetConfig = {
  imageUrl: string;
  scale: number;
  animations?: Record<string, AnimationConfig>;
}

type AssetPack = {
  id: string;
  name: string;
  description: string;
  assets: Record<string, AssetConfig>; // Keyed by Template ID
}
```

### Runtime Integration
-   `GameRuntime` will take an optional `assetOverrides` prop.
-   `EntityRenderer` will check `assetOverrides[entity.templateId]` before using the entity's embedded sprite.

## 3. Asset Generation Pipeline
Automate the creation of assets using the Scenario API.

### TRPC Endpoints
-   `assets.generateForGame`:
    -   Input: `{ gameId: string, prompt: string, style: 'pixel' | 'cartoon' | '3d' }`
    -   Process:
        1.  Fetch game definition.
        2.  Identify all distinct `EntityTemplates`.
        3.  Generate prompts for each template based on the game's theme (`prompt`) and the template's role (player, enemy, wall).
        4.  Call `AssetService.generateBatch`.
        5.  Create a new `AssetPack` with the results.
        6.  Save game definition with the new pack.
    -   Output: `AssetPack`

### Asset Prompts
-   Use existing `AssetService` but enhance `buildPrompt` to accept context (e.g., "A brick in a candy-themed breakout game").

## 4. Frontend Integration
-   **Game Editor/Preview**:
    -   Add "Generate Assets" button.
    -   Add "Debug View" toggle (Eye icon).
    -   Add "Asset Pack" selector (if multiple exist).
-   **Flow**:
    1.  User clicks "Generate Assets" -> Input theme (e.g., "Space Station").
    2.  Show progress bar.
    3.  On completion, auto-switch to new Asset Pack.

## Execution Steps

1.  **Debug Rendering**: Implement `debugMode` in `GameRuntime` and `EntityRenderer`.
2.  **Asset Pack Schema**: Update `schema.ts` and `types.ts`.
3.  **Runtime Support**: Update `GameRuntime` to support `activeAssetPack`.
4.  **Generation API**: Implement `assets.generateForGame` TRPC procedure.
5.  **UI Implementation**: Add controls to the Game Preview screen.
