import type { AssetType, Stage } from './types';
import {
  silhouetteStage,
  buildPromptStage,
  uploadToProviderStage,
  img2imgStage,
  txt2imgStage,
  removeBackgroundStage,
  layeredDecomposeStage,
  uploadR2Stage,
  sheetGuideStage,
  buildSheetMetadataStage,
} from './stages';

export const pipelineRegistry: Record<AssetType, Stage[]> = {
  entity: [
    silhouetteStage,
    buildPromptStage,
    uploadToProviderStage,
    img2imgStage,
    removeBackgroundStage,
    uploadR2Stage,
  ],
  background: [
    buildPromptStage,
    txt2imgStage,
    uploadR2Stage,
  ],
  title_hero: [
    buildPromptStage,
    txt2imgStage,
    // removeBackgroundStage, // Commented out: Keep backgrounds for hero title images to use in game detail pages
    uploadR2Stage,
  ],
  title_hero_no_bg: [
    buildPromptStage,
    txt2imgStage,
    removeBackgroundStage,
    uploadR2Stage,
  ],
  parallax: [
    buildPromptStage,
    txt2imgStage,
    layeredDecomposeStage,
    uploadR2Stage,
  ],
  sheet: [
    sheetGuideStage,
    buildPromptStage,
    uploadToProviderStage,
    img2imgStage,
    removeBackgroundStage,
    buildSheetMetadataStage,
    uploadR2Stage,
  ],
  text_grid: [
    buildPromptStage,
    txt2imgStage,
    uploadR2Stage,
  ],
};

export function getStagesForAssetType(assetType: AssetType): Stage[] {
  const stages = pipelineRegistry[assetType];
  if (!stages) {
    throw new Error(`Unknown asset type: ${assetType}`);
  }
  return stages;
}
