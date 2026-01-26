import type { Stage, AssetRun, PipelineAdapters, DebugSink, UIComponentSheetSpec } from '../types';
import { isUIComponentSpec } from '../types';
import { createNinePatchSilhouette } from '../silhouettes/ui-component';
import { 
  createPanelSilhouette, 
  createProgressBarSilhouette, 
  createScrollBarSilhouette, 
  createTabBarSilhouette 
} from '../silhouettes/ui-component-svg';
import { buildUIComponentPrompt } from '../prompt-builder';
import { getControlConfig, getControlBaseState } from '../ui-control-config';

export const uiBaseStateStage: Stage = {
  id: 'ui-base-state',
  name: 'Generate UI Base State',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isUIComponentSpec(run.spec)) {
      return run;
    }

    const spec = run.spec as UIComponentSheetSpec;
    const config = getControlConfig(spec.componentType);
    const { width, height } = config.dimensions;
    const marginSize = spec.ninePatchMargins.left;

    let silhouettePng: Uint8Array;
    
    switch (spec.componentType) {
      case 'button':
      case 'checkbox':
        silhouettePng = await createNinePatchSilhouette({
          width: 64,
          height: 64,
          marginSize,
          canvasSize: width,
        });
        break;
      
      case 'panel':
        silhouettePng = await createPanelSilhouette({
          width,
          height,
          margin: marginSize,
        });
        break;
      
      case 'progress_bar':
        silhouettePng = await createProgressBarSilhouette({
          width,
          height,
        });
        break;
      
      case 'scroll_bar_h':
        silhouettePng = await createScrollBarSilhouette({
          orientation: 'h',
        });
        break;
      
      case 'scroll_bar_v':
        silhouettePng = await createScrollBarSilhouette({
          orientation: 'v',
        });
        break;
      
      case 'tab_bar':
        silhouettePng = await createTabBarSilhouette({
          width,
          height,
        });
        break;
      
      default:
        silhouettePng = await createNinePatchSilhouette({
          width: 64,
          height: 64,
          marginSize,
          canvasSize: width,
        });
        break;
    }

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'ui-base-state',
      name: '1-silhouette.png',
      contentType: 'image/png',
      data: silhouettePng,
    });

    const silhouetteAssetId = await adapters.scenario.uploadImage(silhouettePng);

    const baseState = getControlBaseState(spec.componentType);
    
    const { prompt, negativePrompt } = buildUIComponentPrompt({
      componentType: spec.componentType,
      state: baseState,
      theme: run.meta.theme,
      baseResolution: width,
    });

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'ui-base-state',
      name: '2-prompt-normal.txt',
      contentType: 'text/plain',
      data: `=== POSITIVE ===\n${prompt}\n\n=== NEGATIVE ===\n${negativePrompt}`,
    });

    const img2imgResult = await adapters.scenario.img2img({
      imageAssetId: silhouetteAssetId,
      prompt,
      strength: 0.95,
    });

    const { buffer: generatedBuffer } = await adapters.scenario.downloadImage(img2imgResult.assetId);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'ui-base-state',
      name: '3-generated-normal.png',
      contentType: 'image/png',
      data: generatedBuffer,
    });

    const bgRemoveResult = await adapters.scenario.removeBackground(img2imgResult.assetId);
    const { buffer: finalBuffer } = await adapters.scenario.downloadImage(bgRemoveResult.assetId);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'ui-base-state',
      name: '4-final-normal.png',
      contentType: 'image/png',
      data: finalBuffer,
    });

    return {
      ...run,
      artifacts: {
        ...run.artifacts,
        baseStateImage: finalBuffer,
        stateImages: { normal: finalBuffer },
        scenarioAssetId: bgRemoveResult.assetId,
      },
    };
  },
};

export const uiVariationStatesStage: Stage = {
  id: 'ui-variation-states',
  name: 'Generate UI Variation States',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isUIComponentSpec(run.spec)) {
      return run;
    }

    if (!run.artifacts.baseStateImage) {
      throw new Error('ui-base-state stage must run before ui-variation-states');
    }

    const spec = run.spec as UIComponentSheetSpec;
    const config = getControlConfig(spec.componentType);
    const { width } = config.dimensions;
    const baseState = getControlBaseState(spec.componentType);
    const stateImages: Record<string, Uint8Array> = { ...run.artifacts.stateImages };

    const statesToGenerate = spec.states.filter(s => s !== baseState);

    const baseAssetId = await adapters.scenario.uploadImage(run.artifacts.baseStateImage);

    for (const state of statesToGenerate) {
      const { prompt, negativePrompt } = buildUIComponentPrompt({
        componentType: spec.componentType,
        state,
        theme: run.meta.theme,
        baseResolution: width,
      });

      await debug({
        type: 'artifact',
        runId: run.meta.runId,
        assetId: run.spec.id,
        stageId: 'ui-variation-states',
        name: `2-prompt-${state}.txt`,
        contentType: 'text/plain',
        data: `=== POSITIVE ===\n${prompt}\n\n=== NEGATIVE ===\n${negativePrompt}`,
      });

      const img2imgResult = await adapters.scenario.img2img({
        imageAssetId: baseAssetId,
        prompt,
        strength: 0.7,
      });

      const { buffer: generatedBuffer } = await adapters.scenario.downloadImage(img2imgResult.assetId);

      await debug({
        type: 'artifact',
        runId: run.meta.runId,
        assetId: run.spec.id,
        stageId: 'ui-variation-states',
        name: `3-generated-${state}.png`,
        contentType: 'image/png',
        data: generatedBuffer,
      });

      const bgRemoveResult = await adapters.scenario.removeBackground(img2imgResult.assetId);
      const { buffer: finalBuffer } = await adapters.scenario.downloadImage(bgRemoveResult.assetId);

      await debug({
        type: 'artifact',
        runId: run.meta.runId,
        assetId: run.spec.id,
        stageId: 'ui-variation-states',
        name: `4-final-${state}.png`,
        contentType: 'image/png',
        data: finalBuffer,
      });

      stateImages[state] = finalBuffer;
    }

    return {
      ...run,
      artifacts: {
        ...run.artifacts,
        stateImages,
      },
    };
  },
};

export const uiUploadR2Stage: Stage = {
  id: 'ui-upload-r2',
  name: 'Upload UI Component to R2',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isUIComponentSpec(run.spec)) {
      return run;
    }

    if (!run.artifacts.stateImages) {
      throw new Error('ui-variation-states stage must run before ui-upload-r2');
    }

    const spec = run.spec as UIComponentSheetSpec;
    const config = getControlConfig(spec.componentType);
    const { width, height } = config.dimensions;
    const r2Keys: string[] = [];
    const publicUrls: string[] = [];

    const statesMetadata: Record<string, { r2Key: string; publicUrl: string; region: { x: number; y: number; width: number; height: number } }> = {};

    for (const [state, buffer] of Object.entries(run.artifacts.stateImages)) {
      const r2Key = `${run.meta.r2Prefix}/${spec.componentType}/${state}.png`;
      await adapters.r2.put(r2Key, buffer, { contentType: 'image/png' });

      const publicUrl = adapters.r2.getPublicUrl(r2Key);
      r2Keys.push(r2Key);
      publicUrls.push(publicUrl);

      statesMetadata[state] = {
        r2Key,
        publicUrl,
        region: { x: 0, y: 0, width, height },
      };
    }

    const metadata = {
      componentType: spec.componentType,
      states: statesMetadata,
      ninePatchMargins: spec.ninePatchMargins,
      width,
      height,
      generatedAt: Date.now(),
      theme: run.meta.theme,
    };

    const metadataJson = JSON.stringify(metadata, null, 2);
    const metadataKey = `${run.meta.r2Prefix}/${spec.componentType}/metadata.json`;
    await adapters.r2.put(metadataKey, new TextEncoder().encode(metadataJson), { contentType: 'application/json' });

    const metadataUrl = adapters.r2.getPublicUrl(metadataKey);
    r2Keys.push(metadataKey);
    publicUrls.push(metadataUrl);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'ui-upload-r2',
      name: 'metadata.json',
      contentType: 'application/json',
      data: metadataJson,
    });

    return {
      ...run,
      artifacts: {
        ...run.artifacts,
        uiComponentMetadata: metadataJson,
        r2Keys,
        publicUrls,
      },
    };
  },
};
