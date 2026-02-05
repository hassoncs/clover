import { useMemo } from 'react';
import type { RuntimeEntity } from '../types';
import type { AssetConfig, AssetPlacement, GameDefinition, EntityTemplate, ColliderComponent, AssetUrlConfig } from '@slopcade/shared';
import { getAssetUrl } from '@slopcade/shared';
import { trpcReact } from '@/lib/trpc/react';
import { env } from '@/lib/config/env';
import { getServerUrl } from '@/lib/offline/local-asset-server';
import { EMBEDDED_ASSET_MANIFESTS } from '@/lib/offline/embedded-games-registry';

export interface ResolvedAsset {
  assetId?: string;
  imageUrl: string;
  placement: AssetPlacement;
}

export interface AssetResolutionContext {
  activePackId?: string;
  assetPacks?: Record<string, any>;
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
    r2Key: string | null;
    placement?: AssetPlacement | null;
  }>;
}

function useAssetPackFromDatabase(packName: string | undefined) {
  return trpcReact.assetSystem.getPackByName.useQuery(
    { name: packName! },
    { 
      enabled: !!packName,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }
  );
}

function convertDbPackToEmbedded(dbPack: DatabasePack, config?: AssetUrlConfig): any {
  const assets: Record<string, AssetConfig> = {};
  for (const entry of dbPack.entries) {
    if (entry.r2Key) {
      const fullUrl = getAssetUrl(entry.r2Key, env.assetCdnUrl, config);
      assets[entry.templateId] = {
        imageUrl: fullUrl,
        assetRef: entry.r2Key,
        source: 'generated' as const,
        scale: entry.placement?.scale ?? 1,
        offsetX: entry.placement?.offsetX ?? 0,
        offsetY: entry.placement?.offsetY ?? 0,
      };
    }
  }
  return { ...dbPack, assets };
}

function convertEmbeddedManifestToPack(
  gameId: string,
  manifest: Record<string, { file: string; r2Key: string }>,
  config?: AssetUrlConfig
): any {
  const assets: Record<string, AssetConfig> = {};
  for (const [templateId, entry] of Object.entries(manifest)) {
    const fullUrl = getAssetUrl(entry.r2Key, env.assetCdnUrl, config);
    assets[templateId] = {
      imageUrl: fullUrl,
      assetRef: entry.r2Key,
      source: 'generated' as const,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }
  return { id: gameId, name: gameId, assets };
}

function validatePackCoverage(
  templates: Record<string, EntityTemplate>,
  pack: any
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

export function getDimensionsFromCollider(collider: ColliderComponent): { width: number; height: number } | null {
  switch (collider.shape) {
    case 'box': return { width: collider.width, height: collider.height };
    case 'circle': return { width: collider.radius * 2, height: collider.radius * 2 };
    case 'capsule': return { width: collider.radius * 2, height: collider.height };
    case 'polygon': return null;
  }
}

export function resolveAssetForEntity(
  entity: RuntimeEntity,
  context: AssetResolutionContext
): ResolvedAsset | null {
  const { activePackId, assetPacks, entityAssetOverrides } = context;

  if (entityAssetOverrides?.[entity.id]) {
    const override = entityAssetOverrides[entity.id];
    const pack = Object.values(assetPacks ?? {}).find(p => 
      Object.values(p.assets as Record<string, AssetConfig>).some((a: any) => a.imageUrl && override.assetId)
    );
    
    if (pack && override.assetId) {
      const asset = Object.entries(pack.assets as Record<string, AssetConfig>).find(([_, a]) => a.imageUrl)?.[1];
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
  definition: GameDefinition,
  options?: { source?: 'template' | 'database' }
): Map<string, ResolvedAsset | null> {
  const activePackId = definition.assetSystem?.activePackId;
  const source = options?.source ?? 'database';
  const gameId = definition.metadata.id;
  
  const dbPackQuery = useAssetPackFromDatabase(activePackId);
  
  // Get embedded asset manifest synchronously for template games
  const embeddedPackData = useMemo(() => {
    if (source !== 'template' || !gameId) return null;
    const manifest = EMBEDDED_ASSET_MANIFESTS[gameId];
    if (!manifest) return null;
    return convertEmbeddedManifestToPack(gameId, manifest, {
      offlineMode: true,
      localServerUrl: getServerUrl(),
      gameId,
    });
  }, [source, gameId]);

  return useMemo(() => {
    let mergedPacks: Record<string, any> = {};

    if (source === 'template' && embeddedPackData) {
      mergedPacks[embeddedPackData.name] = embeddedPackData;
    } else if (dbPackQuery.data) {
      const dbPack = convertDbPackToEmbedded(dbPackQuery.data, {
        offlineMode: true,
        localServerUrl: getServerUrl(),
        gameId,
      });
      mergedPacks[dbPack.name] = dbPack;
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
      entityAssetOverrides: (definition.assetSystem as any)?.entityAssetOverrides,
    };

    const resolutionMap = new Map<string, ResolvedAsset | null>();
    
    for (const entity of entities) {
      resolutionMap.set(entity.id, resolveAssetForEntity(entity, context));
    }

    return resolutionMap;
  }, [
    entities,
    activePackId,
    source,
    gameId,
    definition.assetSystem,
    definition.templates,
    embeddedPackData,
    dbPackQuery.data,
  ]);
}

export function getAssetOverridesFromPack(
  packId: string | undefined,
  assetPacks: Record<string, any> | undefined
): Record<string, AssetConfig> | undefined {
  if (!packId || !assetPacks?.[packId]) {
    return undefined;
  }
  return assetPacks[packId].assets;
}
