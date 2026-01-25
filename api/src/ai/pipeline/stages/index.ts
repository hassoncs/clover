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
    // Accept either silhouette (for entities) or sheet guide (for sheets)
    const imageToUpload = run.artifacts.silhouettePng ?? run.artifacts.sheetGuidePng;
    if (!imageToUpload) {
      throw new Error('silhouette or sheet-guide stage must run before upload-scenario');
    }

    const scenarioAssetId = await adapters.scenario.uploadImage(imageToUpload);

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
      strength: 0.92,
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

      if (run.artifacts.sheetMetadataJson && run.spec.type === 'sheet') {
        const metadataKey = `${run.meta.r2Prefix}/${run.spec.id}.json`;
        const metadataBuffer = new Uint8Array(Buffer.from(run.artifacts.sheetMetadataJson));
        await adapters.r2.put(metadataKey, metadataBuffer, { 
          contentType: 'application/json' 
        });
        r2Keys.push(metadataKey);
        publicUrls.push(adapters.r2.getPublicUrl(metadataKey));
      }
    }

    return {
      ...run,
      artifacts: { ...run.artifacts, r2Keys, publicUrls },
    };
  },
};

const VARIANT_COLOR_MAP: Record<string, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
  purple: '#AA44FF',
  orange: '#FF8844',
  pink: '#FF44AA',
  cyan: '#44FFFF',
  white: '#FFFFFF',
  black: '#222222',
  gold: '#FFD700',
  silver: '#C0C0C0',
};

function getColorForVariant(key: string, index: number): string {
  const lowerKey = key.toLowerCase();
  if (VARIANT_COLOR_MAP[lowerKey]) {
    return VARIANT_COLOR_MAP[lowerKey];
  }
  const fallbackColors = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#AA44FF', '#FF8844', '#44FFFF', '#FF44AA'];
  return fallbackColors[index % fallbackColors.length];
}

export const sheetGuideStage: Stage = {
  id: 'sheet-guide',
  name: 'Create Sheet Guide',
  async run(run: AssetRun, _adapters: PipelineAdapters, debug: DebugSink): Promise<AssetRun> {
    if (!isSheetSpec(run.spec)) {
      return run;
    }

    const spec = run.spec;
    const { width: gridWidth, height: gridHeight } = calculateSheetDimensions(spec.layout);
    const entries = getSheetEntries(spec);

    const sharp = (await import('sharp')).default;

    const CANVAS_SIZE = 512;
    const scale = Math.min(CANVAS_SIZE / gridWidth, CANVAS_SIZE / gridHeight) * 0.9;
    const offsetX = (CANVAS_SIZE - gridWidth * scale) / 2;
    const offsetY = (CANVAS_SIZE - gridHeight * scale) / 2;

    let silhouettes = '';
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const centerX = offsetX + (entry.x + entry.width / 2) * scale;
      const centerY = offsetY + (entry.y + entry.height / 2) * scale;
      const radius = Math.min(entry.width, entry.height) * scale * 0.4;

      let fillColor = '#888888';
      if (spec.kind === 'variation' && spec.variants && spec.variants[i]) {
        fillColor = getColorForVariant(spec.variants[i].key, i);
      }

      silhouettes += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${fillColor}"/>`;
    }

    const svg = `<svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="white"/>
      ${silhouettes}
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
    const { width: gridWidth, height: gridHeight } = calculateSheetDimensions(spec.layout);
    const entries = getSheetEntries(spec);

    const CANVAS_SIZE = 512;
    const scale = Math.min(CANVAS_SIZE / gridWidth, CANVAS_SIZE / gridHeight) * 0.9;
    const offsetX = (CANVAS_SIZE - gridWidth * scale) / 2;
    const offsetY = (CANVAS_SIZE - gridHeight * scale) / 2;

    const metadata: Record<string, unknown> = {
      id: spec.id,
      kind: spec.kind,
      layout: spec.layout,
      dimensions: { width: CANVAS_SIZE, height: CANVAS_SIZE },
      entries:
        spec.kind === 'variation'
          ? (() => {
              const variants = (spec as VariationSheetSpec).variants ?? [];
              const byId: Record<string, unknown> = {};

              for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                const variantKey = variants[i]?.key ?? `variant_${e.index}`;

                byId[variantKey] = {
                  id: variantKey,
                  region: {
                    x: Math.round(offsetX + e.x * scale),
                    y: Math.round(offsetY + e.y * scale),
                    w: Math.round(e.width * scale),
                    h: Math.round(e.height * scale),
                  },
                };
              }

              return byId;
            })()
          : entries.map(e => ({
              index: e.index,
              region: {
                x: Math.round(offsetX + e.x * scale),
                y: Math.round(offsetY + e.y * scale),
                width: Math.round(e.width * scale),
                height: Math.round(e.height * scale),
              },
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
      const variationSpec = spec as VariationSheetSpec;
      const variantKeys = (variationSpec.variants ?? []).map(v => v.key);
      const variantsByKey: Record<string, unknown> = {};

      for (const key of variantKeys) {
        variantsByKey[key] = { entryId: key };
      }

      metadata.groups = {
        default: {
          id: 'default',
          variants: variantsByKey,
          order: variantKeys,
        },
      };
      metadata.defaultGroupId = 'default';
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
