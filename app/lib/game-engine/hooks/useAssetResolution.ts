import type {
	AssetConfig,
	AssetPlacement,
	AssetUrlConfig,
	ColliderComponent,
	EntityPrefab,
	GameDefinition,
} from "@slopcade/shared";
import { getAssetUrl } from "@slopcade/shared";
import { useMemo } from "react";
import { env } from "@/lib/config/env";
import { getServerUrl } from "@/lib/offline/local-asset-server";
import { trpcReact } from "@/lib/trpc/react";
import type { RuntimeEntity } from "../types";

export interface ResolvedAsset {
	assetId?: string;
	imageUrl: string;
	placement: AssetPlacement;
}

export interface AssetResolutionContext {
	activeRemixId?: string;
	assetPacks?: Record<string, any>;
	entityAssetOverrides?: Record<
		string,
		{ assetId: string; placement?: AssetPlacement }
	>;
}

const DEFAULT_PLACEMENT: AssetPlacement = {
	scale: 1,
	offsetX: 0,
	offsetY: 0,
};

function useRemixFromDatabase(remixId: string | undefined) {
	return trpcReact.assetSystem.remixes.getRemix.useQuery(
		{ id: remixId! },
		{
			enabled: !!remixId,
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		},
	);
}

function convertRemixToEmbedded(
	remix: {
		id: string;
		name: string;
		overrides: {
			assets?: Record<
				string,
				{ assetUrl: string; placement?: Partial<AssetPlacement> }
			>;
		};
	},
	_config?: AssetUrlConfig,
): any {
	const assets: Record<string, AssetConfig> = {};
	const assetOverrides = remix.overrides.assets;
	if (assetOverrides) {
		for (const [prefabId, entry] of Object.entries(assetOverrides)) {
			assets[prefabId] = {
				imageUrl: entry.assetUrl,
				source: "generated" as const,
				scale: entry.placement?.scale ?? 1,
				offsetX: entry.placement?.offsetX ?? 0,
				offsetY: entry.placement?.offsetY ?? 0,
			};
		}
	}
	return { ...remix, assets };
}

function validatePackCoverage(
	prefabs: Record<string, EntityPrefab>,
	pack: any,
): void {
	const imagePrefabs = Object.entries(prefabs)
		.filter(([_, t]) => t.visual?.type === "image")
		.map(([id]) => id);

	const missingAssets = imagePrefabs.filter(
		(id: string) => !pack.assets[id]?.imageUrl,
	);

	if (missingAssets.length > 0) {
		throw new Error(
			`Asset pack "${pack.id}" missing required assets for prefabs: ${missingAssets.join(", ")}. ` +
				`Each prefab with visual.type='image' must have a corresponding entry in the asset pack.`,
		);
	}
}

export function getDimensionsFromCollider(
	collider: ColliderComponent,
): { width: number; height: number } | null {
	switch (collider.shape) {
		case "box":
			return { width: collider.width, height: collider.height };
		case "circle":
			return { width: collider.radius * 2, height: collider.radius * 2 };
		case "capsule":
			return { width: collider.radius * 2, height: collider.height };
		case "polygon":
			return null;
	}
}

export function resolveAssetForEntity(
	entity: RuntimeEntity,
	context: AssetResolutionContext,
): ResolvedAsset | null {
	const { activeRemixId, assetPacks, entityAssetOverrides } = context;

	if (entityAssetOverrides?.[entity.id]) {
		const override = entityAssetOverrides[entity.id];
		const pack = Object.values(assetPacks ?? {}).find((p) =>
			Object.values(p.assets as Record<string, AssetConfig>).some(
				(a: any) => a.imageUrl && override.assetId,
			),
		);

		if (pack && override.assetId) {
			const asset = Object.entries(
				pack.assets as Record<string, AssetConfig>,
			).find(([_, a]) => a.imageUrl)?.[1];
			if (asset?.imageUrl) {
				return {
					assetId: override.assetId,
					imageUrl: asset.imageUrl,
					placement: override.placement ?? DEFAULT_PLACEMENT,
				};
			}
		}
	}

	const remixIdToUse = entity.assetPackId ?? activeRemixId;
	if (!remixIdToUse || !assetPacks?.[remixIdToUse]) {
		return null;
	}

	const pack = assetPacks[remixIdToUse];
	const prefabId = entity.prefab;

	if (!prefabId || !pack.assets[prefabId]) {
		return null;
	}

	const assetConfig = pack.assets[prefabId];
	if (!assetConfig.imageUrl || assetConfig.source === "none") {
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
): Map<string, ResolvedAsset | null> {
	const activeRemixId = definition.assetSystem?.activeRemixId;

	const dbRemixQuery = useRemixFromDatabase(activeRemixId);

	return useMemo(() => {
		const mergedPacks: Record<string, any> = {};

		if (dbRemixQuery.data) {
			const dbPack = convertRemixToEmbedded(dbRemixQuery.data, {
				offlineMode: true,
				localServerUrl: getServerUrl(),
			});
			mergedPacks[dbPack.name] = dbPack;
		}

		if (activeRemixId && mergedPacks[activeRemixId] && definition.prefabs) {
			try {
				validatePackCoverage(definition.prefabs, mergedPacks[activeRemixId]);
			} catch (error) {
				console.error("[useAssetResolution]", error);
				throw error;
			}
		}

		const context: AssetResolutionContext = {
			activeRemixId,
			assetPacks: mergedPacks,
			entityAssetOverrides: (definition.assetSystem as any)
				?.entityAssetOverrides,
		};

		const resolutionMap = new Map<string, ResolvedAsset | null>();

		for (const entity of entities) {
			resolutionMap.set(entity.id, resolveAssetForEntity(entity, context));
		}

		return resolutionMap;
	}, [
		entities,
		activeRemixId,
		definition.assetSystem,
		definition.prefabs,
		dbRemixQuery.data,
	]);
}

export function getAssetOverridesFromRemix(
	remixId: string | undefined,
	assetPacks: Record<string, any> | undefined,
): Record<string, AssetConfig> | undefined {
	if (!remixId || !assetPacks?.[remixId]) {
		return undefined;
	}
	return assetPacks[remixId].assets;
}
