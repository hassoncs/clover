import type {
  Stage,
  AssetRun,
  PipelineAdapters,
  DebugSink,
  EntitySpec,
  SheetLayout,
  SpriteSheetSpec,
  TileSheetSpec,
  VariationSheetSpec,
} from '../types';
import { buildPromptForSpec } from '../prompt-builder';

type SheetSpec = SpriteSheetSpec | TileSheetSpec | VariationSheetSpec;

function isSheetSpec(spec: { type: string }): spec is SheetSpec {
  return spec.type === 'sheet';
}

function calculateSheetDimensions(layout: SheetLayout): { width: number; height: number } {
  if (layout.type === 'grid') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    const width = margin * 2 + layout.columns * layout.cellWidth + (layout.columns - 1) * spacing;
    const height = margin * 2 + layout.rows * layout.cellHeight + (layout.rows - 1) * spacing;
    return { width, height };
  } else if (layout.type === 'strip') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    if (layout.direction === 'horizontal') {
      const width = margin * 2 + layout.frameCount * layout.cellWidth + (layout.frameCount - 1) * spacing;
      const height = margin * 2 + layout.cellHeight;
      return { width, height };
    } else {
      const width = margin * 2 + layout.cellWidth;
      const height = margin * 2 + layout.frameCount * layout.cellHeight + (layout.frameCount - 1) * spacing;
      return { width, height };
    }
  }
  return { width: 512, height: 512 };
}

function getSheetEntries(spec: SheetSpec): Array<{ index: number; x: number; y: number; width: number; height: number; key?: string }> {
  const layout = spec.layout;
  const entries: Array<{ index: number; x: number; y: number; width: number; height: number; key?: string }> = [];

  if (layout.type === 'grid') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    let index = 0;
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.columns; col++) {
        const x = margin + col * (layout.cellWidth + spacing);
        const y = margin + row * (layout.cellHeight + spacing);
        entries.push({ index, x, y, width: layout.cellWidth, height: layout.cellHeight });
        index++;
      }
    }
  } else if (layout.type === 'strip') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    for (let i = 0; i < layout.frameCount; i++) {
      const x = layout.direction === 'horizontal' ? margin + i * (layout.cellWidth + spacing) : margin;
      const y = layout.direction === 'vertical' ? margin + i * (layout.cellHeight + spacing) : margin;
      entries.push({ index: i, x, y, width: layout.cellWidth, height: layout.cellHeight });
    }
  }

  return entries;
}

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

export const sheetGuideStage: Stage = {
  id: 'sheet-guide',
  name: 'Create Sheet Guide',
  async run(run: AssetRun, _adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isSheetSpec(run.spec)) {
      return run;
    }

    const spec = run.spec;
    const { width, height } = calculateSheetDimensions(spec.layout);
    const entries = getSheetEntries(spec);

    const sharp = (await import('sharp')).default;

    let gridLines = '';
    for (const entry of entries) {
      gridLines += `<rect x="${entry.x}" y="${entry.y}" width="${entry.width}" height="${entry.height}" fill="none" stroke="black" stroke-width="1"/>`;
      const fontSize = Math.min(entry.width, entry.height) / 4;
      const textX = entry.x + entry.width / 2;
      const textY = entry.y + entry.height / 2 + fontSize / 3;
      gridLines += `<text x="${textX}" y="${textY}" font-size="${fontSize}" text-anchor="middle" fill="rgba(0,0,0,0.3)">${entry.index}</text>`;
    }

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      ${gridLines}
    </svg>`;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const sheetGuidePng = new Uint8Array(buffer);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'sheet-guide',
      name: 'sheet-guide.png',
      contentType: 'image/png',
      data: sheetGuidePng,
    });

    return {
      ...run,
      artifacts: { ...run.artifacts, sheetGuidePng },
    };
  },
};

export const buildSheetMetadataStage: Stage = {
  id: 'build-sheet-metadata',
  name: 'Build Sheet Metadata',
  async run(run: AssetRun, _adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isSheetSpec(run.spec)) {
      return run;
    }

    const spec = run.spec;
    const { width, height } = calculateSheetDimensions(spec.layout);
    const entries = getSheetEntries(spec);

    const metadata: Record<string, unknown> = {
      id: spec.id,
      kind: spec.kind,
      layout: spec.layout,
      dimensions: { width, height },
      entries: entries.map(e => ({
        index: e.index,
        region: { x: e.x, y: e.y, width: e.width, height: e.height },
      })),
    };

    if (spec.promptConfig) {
      metadata.promptConfig = spec.promptConfig;
    }

    if (spec.kind === 'sprite') {
      metadata.animations = (spec as SpriteSheetSpec).animations;
    } else if (spec.kind === 'tile') {
      const tileSpec = spec as TileSheetSpec;
      metadata.tileWidth = tileSpec.tileWidth;
      metadata.tileHeight = tileSpec.tileHeight;
      if (tileSpec.tileOverrides) {
        metadata.tileOverrides = tileSpec.tileOverrides;
      }
    } else if (spec.kind === 'variation') {
      metadata.variants = (spec as VariationSheetSpec).variants;
    }

    const sheetMetadataJson = JSON.stringify(metadata, null, 2);

    await debug({
      type: 'artifact',
      runId: run.meta.runId,
      assetId: run.spec.id,
      stageId: 'build-sheet-metadata',
      name: 'sheet-metadata.json',
      contentType: 'application/json',
      data: sheetMetadataJson,
    });

    return {
      ...run,
      artifacts: { ...run.artifacts, sheetMetadataJson },
    };
  },
};
