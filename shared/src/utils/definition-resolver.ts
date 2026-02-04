import type { GameDefinition, ImageField, GameMetadata, ParallaxLayer, StaticBackground, BackgroundConfig } from '../types/GameDefinition';
import { buildR2Key, getAssetUrl } from './asset-url';

export interface AssetResolverContext {
  baseUrl: string;
  gameId: string;
  packId: string;
}

/**
 * Resolves an asset reference (assetId) to a full URL using V3 R2 key pattern.
 */
function resolveAssetReference(
  assetRef: string,
  baseUrl: string,
  gameId: string,
  packId: string
): string {
  const r2Key = buildR2Key(gameId, packId, assetRef);
  return getAssetUrl(r2Key, baseUrl);
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

  if (definition.background) {
    result.background = resolveBackground(definition.background, context);
  }

  return result;
}
