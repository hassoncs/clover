import { resolveAssetReference } from './asset-url';
import type { GameDefinition, ImageField, GameMetadata, AssetPack, ParallaxLayer, StaticBackground, BackgroundConfig } from '../types/GameDefinition';

export interface AssetResolverContext {
  baseUrl: string;
  gameId: string;
  packId: string;
}

function resolveImageField<T extends ImageField>(
  field: T,
  context: AssetResolverContext
): T {
  if (field.imageUrl) {
    return field;
  }

  if (field.assetRef) {
    const resolvedUrl = resolveAssetReference(
      field.assetRef,
      context.baseUrl,
      context.gameId,
      context.packId
    );
    return { ...field, imageUrl: resolvedUrl };
  }

  return field;
}

function resolveMetadataAssets(
  metadata: GameMetadata,
  context: AssetResolverContext
): GameMetadata {
  const result = { ...metadata };

  if (!result.thumbnailUrl && result.thumbnailAssetRef) {
    result.thumbnailUrl = resolveAssetReference(
      result.thumbnailAssetRef,
      context.baseUrl,
      context.gameId,
      context.packId
    );
  }

  if (!result.titleHeroImageUrl && result.titleHeroAssetRef) {
    result.titleHeroImageUrl = resolveAssetReference(
      result.titleHeroAssetRef,
      context.baseUrl,
      context.gameId,
      context.packId
    );
  }

  return result;
}

function resolveAssetPack(
  pack: AssetPack,
  context: AssetResolverContext
): AssetPack {
  const resolvedAssets: Record<string, typeof pack.assets[string]> = {};

  for (const [key, asset] of Object.entries(pack.assets)) {
    resolvedAssets[key] = resolveImageField(asset, context);
  }

  return { ...pack, assets: resolvedAssets };
}

function resolveParallaxLayer(
  layer: ParallaxLayer,
  context: AssetResolverContext
): ParallaxLayer {
  return resolveImageField(layer, context);
}

function resolveBackground(
  background: BackgroundConfig,
  context: AssetResolverContext
): BackgroundConfig {
  if (background.type === 'static') {
    return resolveImageField(background as StaticBackground, context);
  }

  if (background.type === 'parallax') {
    return {
      ...background,
      layers: background.layers.map(layer => resolveParallaxLayer(layer, context)),
    };
  }

  return background;
}

export function resolveGameDefinitionAssets(
  definition: GameDefinition,
  context: AssetResolverContext
): GameDefinition {
  const result: GameDefinition = { ...definition };

  result.metadata = resolveMetadataAssets(definition.metadata, context);

  if (definition.assetPacks) {
    result.assetPacks = {};
    for (const [packKey, pack] of Object.entries(definition.assetPacks)) {
      result.assetPacks[packKey] = resolveAssetPack(pack, context);
    }
  }

  if (definition.background) {
    result.background = resolveBackground(definition.background, context);
  }

  return result;
}
