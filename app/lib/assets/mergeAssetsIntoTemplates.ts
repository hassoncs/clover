import type { GameDefinition } from "@slopcade/shared";
import type { ResolvedPackEntry } from "./AssetManifest";

export function mergeAssetsIntoPrefabs(
  definition: GameDefinition,
  assets: Record<string, ResolvedPackEntry> | undefined
): GameDefinition {
  if (!assets || !definition.prefabs) {
    return definition;
  }

  const cloned = structuredClone(definition);

  let mergedCount = 0;
  for (const [prefabId, prefab] of Object.entries(cloned.prefabs)) {
    if (prefab.visual?.type === "image") {
      const asset = assets[prefabId];
      if (asset?.imageUrl) {
        prefab.visual.url = asset.imageUrl;

        if (asset.placement) {
          if (asset.placement.scale !== undefined) {
            prefab.visual.scale = asset.placement.scale;
          }
          if (asset.placement.offsetX !== undefined) {
            prefab.visual.offsetX = asset.placement.offsetX;
          }
          if (asset.placement.offsetY !== undefined) {
            prefab.visual.offsetY = asset.placement.offsetY;
          }
        }

        mergedCount++;
      } else {
        console.warn(
          `[mergeAssetsIntoPrefabs] Prefab ${prefabId} has visual.type='image' but no asset found`
        );
      }
    }
  }

  console.log(
    `[mergeAssetsIntoPrefabs] Merged ${mergedCount} asset URLs into prefabs`
  );
  return cloned;
}
