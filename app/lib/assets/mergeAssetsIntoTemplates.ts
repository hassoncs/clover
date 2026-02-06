import type { GameDefinition } from "@slopcade/shared";
import type { ResolvedPackEntry } from "./AssetManifest";

export function mergeAssetsIntoTemplates(
  definition: GameDefinition,
  assets: Record<string, ResolvedPackEntry> | undefined
): GameDefinition {
  if (!assets || !definition.templates) {
    return definition;
  }

  const cloned = structuredClone(definition);

  let mergedCount = 0;
  for (const [templateId, template] of Object.entries(cloned.templates)) {
    if (template.visual?.type === "image") {
      const asset = assets[templateId];
      if (asset?.imageUrl) {
        template.visual.url = asset.imageUrl;

        if (asset.placement) {
          if (asset.placement.scale !== undefined) {
            template.visual.scale = asset.placement.scale;
          }
          if (asset.placement.offsetX !== undefined) {
            template.visual.offsetX = asset.placement.offsetX;
          }
          if (asset.placement.offsetY !== undefined) {
            template.visual.offsetY = asset.placement.offsetY;
          }
        }

        mergedCount++;
      } else {
        console.warn(
          `[mergeAssetsIntoTemplates] ⚠️  Template ${templateId} has visual.type='image' but no asset found`
        );
      }
    }
  }

  console.log(
    `[mergeAssetsIntoTemplates] 📦 Merged ${mergedCount} asset URLs into templates`
  );
  return cloned;
}
