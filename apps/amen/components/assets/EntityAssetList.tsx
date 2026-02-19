import type {
	AssetPlacement,
	EntityPrefab,
	GameDefinition,
} from "@slopcade/shared";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { resolveAssetUrl } from "@/lib/config/env";

export interface ResolvedAssetEntry {
	imageUrl: string;
	placement?: AssetPlacement;
}

interface Props {
	gameDefinition: GameDefinition;
	assets: Record<string, ResolvedAssetEntry> | null;
	onRegenerateAsset: (prefabId: string) => void;
	onClearAsset: (prefabId: string) => void;
	regeneratingPrefabId?: string;
}

export function EntityAssetList({
	gameDefinition,
	assets,
	onRegenerateAsset,
	onClearAsset,
	regeneratingPrefabId,
}: Props) {
	const prefabs = Object.entries(gameDefinition.prefabs || {}) as [
		string,
		EntityPrefab,
	][];

	if (prefabs.length === 0) {
		return (
			<View className="p-4 bg-theme-surface-elevated rounded-lg">
				<Text className="text-theme-text-secondary text-center">
					No prefabs in this game
				</Text>
			</View>
		);
	}

	return (
		<View>
			<Text className="text-theme-text-secondary mb-2">Entity Assets</Text>
			<ScrollView className="max-h-48">
				{prefabs.map(([prefabId, prefab]) => {
					const asset = assets?.[prefabId];
					const isRegenerating = regeneratingPrefabId === prefabId;
					const visualColor =
						prefab.visual && "color" in prefab.visual
							? prefab.visual.color
							: "#6B7280";

					return (
						<View
							key={prefabId}
							className="flex-row items-center p-2 bg-theme-surface-elevated rounded-lg mb-2"
						>
							{asset?.imageUrl ? (
								<Image
									source={{ uri: resolveAssetUrl(asset.imageUrl) }}
									className="w-12 h-12 rounded"
									resizeMode="contain"
								/>
							) : (
								<View
									className="w-12 h-12 rounded items-center justify-center"
									style={{ backgroundColor: visualColor }}
								>
									<Text className="text-theme-text-inverse text-xs">Shape</Text>
								</View>
							)}

							<View className="flex-1 ml-3">
								<Text className="text-theme-text font-medium">{prefabId}</Text>
								<Text className="text-theme-text-secondary text-xs">
									{asset?.imageUrl ? "Generated" : "Using shape fallback"}
								</Text>
							</View>

							<Pressable
								className={`p-2 rounded mr-2 ${isRegenerating ? "bg-theme-surface" : "bg-theme-primary"}`}
								onPress={() => onRegenerateAsset(prefabId)}
								disabled={isRegenerating}
								accessibilityRole="button"
								accessibilityLabel={`Regenerate ${prefabId} asset`}
								accessibilityState={{ disabled: isRegenerating }}
							>
								{isRegenerating ? (
									<ActivityIndicator color="#FDF8F0" size="small" />
								) : (
									<Text className="text-theme-secondary text-xs">Regen</Text>
								)}
							</Pressable>

							{asset?.imageUrl && (
								<Pressable
									className="p-2 bg-theme-error rounded"
									onPress={() => onClearAsset(prefabId)}
									accessibilityRole="button"
									accessibilityLabel={`Clear ${prefabId} asset`}
								>
									<Text className="text-theme-text-inverse text-xs">Clear</Text>
								</Pressable>
							)}
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}
