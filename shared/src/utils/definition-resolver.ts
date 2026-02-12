import type {
	BackgroundConfig,
	GameDefinition,
	GameMetadata,
	ImageField,
	ParallaxLayer,
	StaticBackground,
} from "../types/GameDefinition";
import { buildR2Key, getAssetUrl } from "./asset-url";

export interface AssetResolverContext {
	baseUrl: string;
	gameId: string;
	assetPrefix: string;
}

/**
 * Resolves an asset reference (assetId) to a full URL using V3 R2 key pattern.
 */
function resolveAssetReference(
	assetRef: string,
	baseUrl: string,
	_gameId: string,
	assetPrefix: string,
): string {
	const r2Key = buildR2Key(assetPrefix, assetRef);
	return getAssetUrl(r2Key, baseUrl);
}

function resolveImageField<T extends ImageField>(
	field: T,
	context: AssetResolverContext,
): T {
	if (field.imageUrl) {
		return field;
	}

	if (field.assetRef) {
		const resolvedUrl = resolveAssetReference(
			field.assetRef,
			context.baseUrl,
			context.gameId,
			context.assetPrefix,
		);
		return { ...field, imageUrl: resolvedUrl };
	}

	return field;
}

function resolveMetadataAssets(
	metadata: GameMetadata,
	context: AssetResolverContext,
): GameMetadata {
	const result = { ...metadata };

	if (!result.thumbnailUrl && result.thumbnailAssetRef) {
		result.thumbnailUrl = resolveAssetReference(
			result.thumbnailAssetRef,
			context.baseUrl,
			context.gameId,
			context.assetPrefix,
		);
	}

	if (!result.titleHeroImageUrl && result.titleHeroAssetRef) {
		result.titleHeroImageUrl = resolveAssetReference(
			result.titleHeroAssetRef,
			context.baseUrl,
			context.gameId,
			context.assetPrefix,
		);
	}

	return result;
}

function resolveParallaxLayer(
	layer: ParallaxLayer,
	context: AssetResolverContext,
): ParallaxLayer {
	return resolveImageField(layer, context);
}

function resolveBackground(
	background: BackgroundConfig,
	context: AssetResolverContext,
): BackgroundConfig {
	if (background.type === "static") {
		return resolveImageField(background as StaticBackground, context);
	}

	if (background.type === "parallax") {
		return {
			...background,
			layers: background.layers.map((layer) =>
				resolveParallaxLayer(layer, context),
			),
		};
	}

	return background;
}

export function resolveGameDefinitionAssets(
	definition: GameDefinition,
	context: AssetResolverContext,
): GameDefinition {
	const result: GameDefinition = { ...definition };

	result.metadata = resolveMetadataAssets(definition.metadata, context);

	if (definition.background) {
		result.background = resolveBackground(definition.background, context);
	}

	return result;
}
