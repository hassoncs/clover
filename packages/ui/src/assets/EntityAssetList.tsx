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
	resolveAssetUrl?: (url: string) => string | undefined;
}

export function EntityAssetList({
	gameDefinition,
	assets,
	onRegenerateAsset,
	onClearAsset,
	regeneratingPrefabId,
	resolveAssetUrl,
}: Props) {
	const prefabs = Object.entries(gameDefinition.prefabs || {}) as [
		string,
		EntityPrefab,
	][];

	if (prefabs.length === 0) {
		return (
			<View className="p-4 bg-gray-700 rounded-lg">
				<Text className="text-gray-400 text-center">
					No prefabs in this game
				</Text>
			</View>
		);
	}

	return (
		<View>
			<Text className="text-gray-400 mb-2">Entity Assets</Text>
			<ScrollView className="max-h-48">
				{prefabs.map(([prefabId, prefab]) => {
					const asset = assets?.[prefabId];
					const isRegenerating = regeneratingPrefabId === prefabId;
					const visualColor =
						prefab.visual && "color" in prefab.visual
							? prefab.visual.color
							: "#666";

					return (
						<View
							key={prefabId}
							className="flex-row items-center p-2 bg-gray-700 rounded-lg mb-2"
						>
							{asset?.imageUrl ? (
								<Image
									source={{
										uri: resolveAssetUrl?.(asset.imageUrl) ?? asset.imageUrl,
									}}
									className="w-12 h-12 rounded"
									resizeMode="contain"
								/>
							) : (
								<View
									className="w-12 h-12 rounded items-center justify-center"
									style={{ backgroundColor: visualColor }}
								>
									<Text className="text-white text-xs">Shape</Text>
								</View>
							)}

							<View className="flex-1 ml-3">
								<Text className="text-white font-medium">{prefabId}</Text>
								<Text className="text-gray-400 text-xs">
									{asset?.imageUrl ? "Generated" : "Using shape fallback"}
								</Text>
							</View>

							<Pressable
								className={`p-2 rounded mr-2 ${isRegenerating ? "bg-gray-600" : "bg-indigo-600"}`}
								onPress={() => onRegenerateAsset(prefabId)}
								disabled={isRegenerating}
								accessibilityRole="button"
								accessibilityLabel={`Regenerate ${prefabId} asset`}
								accessibilityState={{ disabled: isRegenerating }}
							>
								{isRegenerating ? (
									<ActivityIndicator color="white" size="small" />
								) : (
									<Text className="text-white text-xs">Regen</Text>
								)}
							</Pressable>

							{asset?.imageUrl && (
								<Pressable
									className="p-2 bg-red-600 rounded"
									onPress={() => onClearAsset(prefabId)}
									accessibilityRole="button"
									accessibilityLabel={`Clear ${prefabId} asset`}
								>
									<Text className="text-white text-xs">Clear</Text>
								</Pressable>
							)}
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
}
