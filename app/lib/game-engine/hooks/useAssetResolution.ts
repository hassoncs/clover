import { useMemo } from 'react';
import type { RuntimeEntity } from '../types';
import type { AssetPack, AssetConfig, AssetPlacement, GameDefinition } from '@slopcade/shared';

export interface ResolvedAsset {
  assetId?: string;
  imageUrl: string;
  placement: AssetPlacement;
}

export interface AssetResolutionContext {
  activePackId?: string;
  assetPacks?: Record<string, AssetPack>;
  entityAssetOverrides?: Record<string, { assetId: string; placement?: AssetPlacement }>;
}

const DEFAULT_PLACEMENT: AssetPlacement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function resolveAssetForEntity(
  entity: RuntimeEntity,
  context: AssetResolutionContext
): ResolvedAsset | null {
  const { activePackId, assetPacks, entityAssetOverrides } = context;

  if (entityAssetOverrides?.[entity.id]) {
    const override = entityAssetOverrides[entity.id];
    const pack = Object.values(assetPacks ?? {}).find(p => 
      Object.values(p.assets).some(a => a.imageUrl && override.assetId)
    );
    
    if (pack && override.assetId) {
      const asset = Object.entries(pack.assets).find(([_, a]) => a.imageUrl)?.[1];
      if (asset?.imageUrl) {
        return {
          assetId: override.assetId,
          imageUrl: asset.imageUrl,
          placement: override.placement ?? DEFAULT_PLACEMENT,
        };
      }
    }
  }

  const packIdToUse = entity.assetPackId ?? activePackId;
  if (!packIdToUse || !assetPacks?.[packIdToUse]) {
    return null;
  }

  const pack = assetPacks[packIdToUse];
  const templateId = entity.template;
  
  if (!templateId || !pack.assets[templateId]) {
    return null;
  }

  const assetConfig = pack.assets[templateId];
  if (!assetConfig.imageUrl || assetConfig.source === 'none') {
    return null;
  }

  return {
    imageUrl: assetConfig.imageUrl,
    placement: {
      scale: assetConfig.scale ?? 1,
      offsetX: assetConfig.offsetX ?? 0,
      offsetY: assetConfig.offsetY ?? 0,
    },
  };
}

export function useAssetResolution(
  entities: RuntimeEntity[],
  definition: GameDefinition
): Map<string, ResolvedAsset | null> {
  return useMemo(() => {
    const context: AssetResolutionContext = {
      activePackId: definition.assetSystem?.activeAssetPackId ?? definition.activeAssetPackId,
      assetPacks: definition.assetPacks,
      entityAssetOverrides: definition.assetSystem?.entityAssetOverrides,
    };

    const resolutionMap = new Map<string, ResolvedAsset | null>();
    
    for (const entity of entities) {
      resolutionMap.set(entity.id, resolveAssetForEntity(entity, context));
    }

    return resolutionMap;
  }, [
    entities,
    definition.assetSystem?.activeAssetPackId,
    definition.activeAssetPackId,
    definition.assetPacks,
    definition.assetSystem?.entityAssetOverrides,
  ]);
}

export function getAssetOverridesFromPack(
  packId: string | undefined,
  assetPacks: Record<string, AssetPack> | undefined
): Record<string, AssetConfig> | undefined {
  if (!packId || !assetPacks?.[packId]) {
    return undefined;
  }
  return assetPacks[packId].assets;
}
