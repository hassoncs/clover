import type { AssetType, Stage } from './types';
import {
  silhouetteStage,
  buildPromptStage,
  uploadToScenarioStage,
  img2imgStage,
  txt2imgStage,
  removeBackgroundStage,
  layeredDecomposeStage,
  uploadR2Stage,
} from './stages';

export const pipelineRegistry: Record<AssetType, Stage[]> = {
  entity: [
    silhouetteStage,
    buildPromptStage,
    uploadToScenarioStage,
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
    removeBackgroundStage,
    uploadR2Stage,
  ],
  parallax: [
    buildPromptStage,
    txt2imgStage,
    layeredDecomposeStage,
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
