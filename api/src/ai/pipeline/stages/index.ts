import type { Stage, AssetRun, PipelineAdapters, DebugSink, EntitySpec } from '../types';
import { buildPromptForSpec } from '../prompt-builder';

export const silhouetteStage: Stage = {
  id: 'silhouette',
  name: 'Create Silhouette',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (run.spec.type !== 'entity') {
      return run;
    }
    
    const entitySpec = run.spec as EntitySpec;
    const silhouettePng = await adapters.silhouette.createSilhouette({
      shape: entitySpec.shape,
      width: entitySpec.width,
      height: entitySpec.height,
    });

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'silhouette',
      name: 'silhouette.png',
      contentType: 'image/png',
      data: silhouettePng,
    });

    return {
      ...run,
      artifacts: { ...run.artifacts, silhouettePng },
    };
  },
};

export const buildPromptStage: Stage = {
  id: 'build-prompt',
  name: 'Build Prompt',
  async run(run: AssetRun, _adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    const { prompt, negativePrompt } = buildPromptForSpec(run.spec, run.meta.theme, run.meta.style);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'build-prompt',
      name: 'prompt.txt',
      contentType: 'text/plain',
      data: `=== POSITIVE PROMPT ===\n${prompt}\n\n=== NEGATIVE PROMPT ===\n${negativePrompt}`,
    });

    return {
      ...run,
      artifacts: { ...run.artifacts, prompt, negativePrompt },
    };
  },
};

export const uploadToScenarioStage: Stage = {
  id: 'upload-scenario',
  name: 'Upload to Scenario',
  async run(run: AssetRun, adapters: PipelineAdapters, _debug: DebugSink): Promise<AssetRun> {
    if (!run.artifacts.silhouettePng) {
      throw new Error('silhouette stage must run before upload-scenario');
    }

    const scenarioAssetId = await adapters.scenario.uploadImage(run.artifacts.silhouettePng);

    return {
      ...run,
      artifacts: { ...run.artifacts, scenarioAssetId },
    };
  },
};

export const img2imgStage: Stage = {
  id: 'img2img',
  name: 'Generate via img2img',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!run.artifacts.scenarioAssetId || !run.artifacts.prompt) {
      throw new Error('upload-scenario and build-prompt stages must run before img2img');
    }

    const result = await adapters.scenario.img2img({
      imageAssetId: run.artifacts.scenarioAssetId,
      prompt: run.artifacts.prompt,
      strength: 0.95,
    });

    const { buffer } = await adapters.scenario.downloadImage(result.assetId);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'img2img',
      name: 'generated.png',
      contentType: 'image/png',
      data: buffer,
    });

    return {
      ...run,
      artifacts: { 
        ...run.artifacts, 
        scenarioAssetId: result.assetId,
        generatedImage: buffer,
      },
    };
  },
};

export const txt2imgStage: Stage = {
  id: 'txt2img',
  name: 'Generate via txt2img',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!run.artifacts.prompt) {
      throw new Error('build-prompt stage must run before txt2img');
    }

    const spec = run.spec;
    const width = 'width' in spec && spec.width ? spec.width : 1024;
    const height = 'height' in spec && spec.height ? spec.height : 1024;

    const result = await adapters.scenario.txt2img({
      prompt: run.artifacts.prompt,
      width,
      height,
      negativePrompt: run.artifacts.negativePrompt,
    });

    const { buffer } = await adapters.scenario.downloadImage(result.assetId);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'txt2img',
      name: 'generated.png',
      contentType: 'image/png',
      data: buffer,
    });

    return {
      ...run,
      artifacts: { 
        ...run.artifacts, 
        scenarioAssetId: result.assetId,
        generatedImage: buffer,
      },
    };
  },
};

export const removeBackgroundStage: Stage = {
  id: 'remove-bg',
  name: 'Remove Background',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!run.artifacts.scenarioAssetId) {
      throw new Error('generation stage must run before remove-bg');
    }

    const result = await adapters.scenario.removeBackground(run.artifacts.scenarioAssetId);
    const { buffer } = await adapters.scenario.downloadImage(result.assetId);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'remove-bg',
      name: 'no-bg.png',
      contentType: 'image/png',
      data: buffer,
    });

    return {
      ...run,
      artifacts: { 
        ...run.artifacts, 
        bgRemovedImage: buffer,
      },
    };
  },
};

export const layeredDecomposeStage: Stage = {
  id: 'layered-decompose',
  name: 'Decompose into Layers',
  async run(run: AssetRun, adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!run.artifacts.scenarioAssetId) {
      throw new Error('generation stage must run before layered-decompose');
    }

    if (run.spec.type !== 'parallax') {
      throw new Error('layered-decompose only works with parallax assets');
    }

    if (!adapters.scenario.layeredDecompose) {
      throw new Error('layeredDecompose not supported by this adapter');
    }

    const result = await adapters.scenario.layeredDecompose({
      imageAssetId: run.artifacts.scenarioAssetId,
      layerCount: run.spec.layerCount,
    });

    const layerImages: Uint8Array[] = [];
    for (let i = 0; i < result.assetIds.length; i++) {
      const { buffer } = await adapters.scenario.downloadImage(result.assetIds[i]);
      layerImages.push(buffer);

      await debug({
        type: 'artifact',
        runId: run.meta.runId,
        assetId: run.spec.id,
        stageId: 'layered-decompose',
        name: `layer-${i}.png`,
        contentType: 'image/png',
        data: buffer,
      });
    }

    return {
      ...run,
      artifacts: { ...run.artifacts, layerImages },
    };
  },
};

export const uploadR2Stage: Stage = {
  id: 'upload-r2',
  name: 'Upload to R2',
  async run(run: AssetRun, adapters: PipelineAdapters, _debug: DebugSink): Promise<AssetRun> {
    const r2Keys: string[] = [];
    const publicUrls: string[] = [];

    const getFinalImage = (): Uint8Array | null => {
      return run.artifacts.bgRemovedImage ?? run.artifacts.generatedImage ?? null;
    };

    if (run.spec.type === 'parallax' && run.artifacts.layerImages) {
      for (let i = 0; i < run.artifacts.layerImages.length; i++) {
        const key = `${run.meta.r2Prefix}/${run.spec.id}-layer-${i}.png`;
        await adapters.r2.put(key, run.artifacts.layerImages[i], { contentType: 'image/png' });
        r2Keys.push(key);
        publicUrls.push(adapters.r2.getPublicUrl(key));
      }
    } else {
      const finalImage = getFinalImage();
      if (!finalImage) {
        throw new Error('No final image to upload');
      }

      const key = `${run.meta.r2Prefix}/${run.spec.id}.png`;
      await adapters.r2.put(key, finalImage, { contentType: 'image/png' });
      r2Keys.push(key);
      publicUrls.push(adapters.r2.getPublicUrl(key));
    }

    return {
      ...run,
      artifacts: { ...run.artifacts, r2Keys, publicUrls },
    };
  },
};
