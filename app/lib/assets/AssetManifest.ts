import type { GameDefinition } from '@slopcade/shared';

export type AssetType = 'image' | 'sound';
export type AssetPriority = 'critical' | 'high' | 'normal';

export interface AssetManifestItem {
  type: AssetType;
  url: string;
  id: string;
  label: string;
  priority: AssetPriority;
  estimatedSizeBytes?: number;
}

export interface AssetManifest {
  images: AssetManifestItem[];
  sounds: AssetManifestItem[];
  totalCount: number;
  estimatedTotalSizeBytes: number;
}

const DEFAULT_IMAGE_SIZE_ESTIMATE = 100_000;
const DEFAULT_SOUND_SIZE_ESTIMATE = 50_000;

export function extractAssetManifest(definition: GameDefinition): AssetManifest {
  const images: AssetManifestItem[] = [];
  const sounds: AssetManifestItem[] = [];
  const seenUrls = new Set<string>();

  const addImage = (
    url: string,
    id: string,
    label: string,
    priority: AssetPriority,
    estimatedSizeBytes?: number
  ) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    images.push({
      type: 'image',
      url,
      id,
      label,
      priority,
      estimatedSizeBytes: estimatedSizeBytes ?? DEFAULT_IMAGE_SIZE_ESTIMATE,
    });
  };

  const addSound = (
    url: string,
    id: string,
    label: string,
    priority: AssetPriority,
    estimatedSizeBytes?: number
  ) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    sounds.push({
      type: 'sound',
      url,
      id,
      label,
      priority,
      estimatedSizeBytes: estimatedSizeBytes ?? DEFAULT_SOUND_SIZE_ESTIMATE,
    });
  };

  // --- Title & Loading Screen Assets ---

  if (definition.metadata.titleHeroImageUrl) {
    addImage(
      definition.metadata.titleHeroImageUrl,
      'title-hero',
      'Title image',
      'critical',
      200_000
    );
  }

  if (definition.loadingScreen?.backgroundImageUrl) {
    addImage(
      definition.loadingScreen.backgroundImageUrl,
      'loading-bg',
      'Loading background',
      'critical',
      150_000
    );
  }

  if (definition.loadingScreen?.progressBarImageUrl) {
    addImage(
      definition.loadingScreen.progressBarImageUrl,
      'progress-bar',
      'Progress bar',
      'critical',
      20_000
    );
  }

  // --- Background & Parallax ---

  if (definition.background?.type === 'static' && definition.background.imageUrl) {
    addImage(
      definition.background.imageUrl,
      'background',
      'Background',
      'critical',
      500_000
    );
  }

  if (definition.parallaxConfig?.enabled && definition.parallaxConfig.layers) {
    const depthPriority: Record<string, AssetPriority> = {
      sky: 'critical',
      far: 'high',
      mid: 'high',
      near: 'normal',
    };
    
    definition.parallaxConfig.layers.forEach((layer) => {
      if (layer.imageUrl && layer.visible !== false) {
        addImage(
          layer.imageUrl,
          `parallax-${layer.id}`,
          layer.name || `${layer.depth} layer`,
          depthPriority[layer.depth] ?? 'normal',
          300_000
        );
      }
    });
  }

  // --- Template Sprites ---

  Object.entries(definition.templates).forEach(([templateId, template]) => {
    if (template.sprite?.type === 'image' && 'imageUrl' in template.sprite) {
      addImage(
        template.sprite.imageUrl,
        `template-${templateId}`,
        templateId,
        'normal'
      );
    }
  });

  // --- Asset Pack Images ---

  const activePackId = definition.activeAssetPackId;
  if (activePackId && definition.assetPacks?.[activePackId]) {
    const pack = definition.assetPacks[activePackId];
    Object.entries(pack.assets).forEach(([templateId, asset]) => {
      if (asset.imageUrl && asset.source !== 'none') {
        addImage(
          asset.imageUrl,
          `pack-${templateId}`,
          templateId,
          'normal'
        );
      }
    });
  }

  // --- Tile Sheets ---

  definition.tileSheets?.forEach((sheet) => {
    if (sheet.imageUrl) {
      addImage(
        sheet.imageUrl,
        `tilesheet-${sheet.id}`,
        sheet.name || sheet.id,
        'high',
        200_000
      );
    }
  });

  // --- Sound Assets ---

  if (definition.sounds) {
    Object.entries(definition.sounds).forEach(([soundId, soundAsset]) => {
      if (soundAsset.url) {
        addSound(
          soundAsset.url,
          `sound-${soundId}`,
          soundId,
          soundAsset.type === 'music' ? 'high' : 'normal',
          soundAsset.type === 'music' ? 500_000 : DEFAULT_SOUND_SIZE_ESTIMATE
        );
      }
    });
  }

  const totalCount = images.length + sounds.length;
  const estimatedTotalSizeBytes =
    images.reduce((sum, img) => sum + (img.estimatedSizeBytes ?? 0), 0) +
    sounds.reduce((sum, snd) => sum + (snd.estimatedSizeBytes ?? 0), 0);

  return {
    images,
    sounds,
    totalCount,
    estimatedTotalSizeBytes,
  };
}

export function sortManifestByPriority(manifest: AssetManifest): AssetManifest {
  const priorityOrder: Record<AssetPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
  };

  const sortFn = (a: AssetManifestItem, b: AssetManifestItem) =>
    priorityOrder[a.priority] - priorityOrder[b.priority];

  return {
    ...manifest,
    images: [...manifest.images].sort(sortFn),
    sounds: [...manifest.sounds].sort(sortFn),
  };
}
