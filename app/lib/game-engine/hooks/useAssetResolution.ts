import { useMemo } from 'react';
import type { RuntimeEntity } from '../types';
import type { AssetPack, AssetConfig, AssetPlacement, GameDefinition, EntityTemplate, ColliderComponent } from '@slopcade/shared';
import { trpcReact } from '@/lib/trpc/react';

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

interface DatabasePack {
  id: string;
  name: string;
  description?: string | null;
  entries: Array<{
    templateId: string;
    imageUrl: string | null;
    placement?: AssetPlacement | null;
  }>;
}

/**
 * Fetch asset pack from database with React Query caching
 */
function useAssetPackFromDatabase(packId: string | undefined) {
  return trpcReact.assetSystem.getPack.useQuery(
    { id: packId! },
    { 
      enabled: !!packId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes
    }
  );
}

/**
 * Convert database pack format to embedded AssetPack format
 */
function convertDbPackToEmbedded(dbPack: DatabasePack): AssetPack {
  const assets: Record<string, AssetConfig> = {};
  for (const entry of dbPack.entries) {
    if (entry.imageUrl) {
      assets[entry.templateId] = {
        imageUrl: entry.imageUrl,
        source: 'generated' as const,
        scale: entry.placement?.scale ?? 1,
        offsetX: entry.placement?.offsetX ?? 0,
        offsetY: entry.placement?.offsetY ?? 0,
      };
    }
  }
  return { id: dbPack.id, name: dbPack.name, assets };
}

/**
 * Validate that all templates with visual.type='image' have corresponding assets
 */
function validatePackCoverage(
  templates: Record<string, EntityTemplate>,
  pack: AssetPack
): void {
  const imageTemplates = Object.entries(templates)
    .filter(([_, t]) => t.visual?.type === 'image')
    .map(([id]) => id);
  
  const missingAssets = imageTemplates.filter(id => !pack.assets[id]?.imageUrl);
  
  if (missingAssets.length > 0) {
    throw new Error(
      `Asset pack "${pack.id}" missing required assets for templates: ${missingAssets.join(', ')}. ` +
      `Each template with visual.type='image' must have a corresponding entry in the asset pack.`
    );
  }
}

/**
 * Derive dimensions from collider component for image sizing
 */
function getDimensionsFromCollider(collider: ColliderComponent): { width: number; height: number } | null {
  switch (collider.shape) {
    case 'box': return { width: collider.width, height: collider.height };
    case 'circle': return { width: collider.radius * 2, height: collider.radius * 2 };
    case 'capsule': return { width: collider.radius * 2, height: collider.height };
    case 'polygon': return null;
  }
}

export function resolveAssetForEntity(
  entity: RuntimeEntity,
  context: AssetResolutionContext,
  templates?: Record<string, EntityTemplate>
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
  const activePackId = definition.assetSystem?.activeAssetPackId ?? definition.activeAssetPackId;
  
  const dbPackQuery = useAssetPackFromDatabase(activePackId);

  return useMemo(() => {
    if (dbPackQuery.isLoading) {
      return new Map<string, ResolvedAsset | null>();
    }

    let mergedPacks = { ...definition.assetPacks };

    if (dbPackQuery.data) {
      const dbPack = convertDbPackToEmbedded(dbPackQuery.data);
      mergedPacks[dbPack.id] = dbPack;
    }

    if (activePackId && mergedPacks[activePackId] && definition.templates) {
      try {
        validatePackCoverage(definition.templates, mergedPacks[activePackId]);
      } catch (error) {
        console.error('[useAssetResolution]', error);
        throw error;
      }
    }

    const context: AssetResolutionContext = {
      activePackId,
      assetPacks: mergedPacks,
      entityAssetOverrides: definition.assetSystem?.entityAssetOverrides,
    };

    const resolutionMap = new Map<string, ResolvedAsset | null>();
    
    for (const entity of entities) {
      resolutionMap.set(entity.id, resolveAssetForEntity(entity, context, definition.templates));
    }

    return resolutionMap;
  }, [
    entities,
    activePackId,
    definition.assetPacks,
    definition.assetSystem?.entityAssetOverrides,
    definition.templates,
    dbPackQuery.isLoading,
    dbPackQuery.data,
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
