import type { EntityPrefab } from "@slopcade/shared";
import { ActivityIndicator, Text, View } from "react-native";
import { PrefabAssetCard } from "./PrefabAssetCard";

interface PrefabGridProps {
	prefabs: Array<{ id: string; prefab: EntityPrefab }>;
	entriesByPrefabId: Map<
		string,
		{
			imageUrl?: string;
			placement?: { scale: number; offsetX: number; offsetY: number };
		}
	>;
	generatingPrefabs: Set<string>;
	isLoading: boolean;
	onPrefabPress: (prefabId: string) => void;
}

export function PrefabGrid({
	prefabs,
	entriesByPrefabId,
	generatingPrefabs,
	isLoading,
	onPrefabPress,
}: PrefabGridProps) {
	if (isLoading) {
		return (
			<View className="p-5 items-center">
				<ActivityIndicator size="large" color="#6366F1" />
			</View>
		);
	}

	if (prefabs.length === 0) {
		return (
			<View className="items-center py-10">
				<Text className="text-secondary-400 text-base">
					No prefabs in this game
				</Text>
				<Text className="text-secondary-500 text-sm mt-1">
					Add entities to your game to see them here
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-row flex-wrap justify-between">
			{prefabs.map(({ id, prefab }) => {
				const entryData = entriesByPrefabId.get(id);
				return (
					<PrefabAssetCard
						key={id}
						prefabId={id}
						prefab={prefab}
						imageUrl={entryData?.imageUrl}
						placement={entryData?.placement}
						isGenerating={generatingPrefabs.has(id)}
						onPress={() => onPrefabPress(id)}
					/>
				);
			})}
		</View>
	);
}
