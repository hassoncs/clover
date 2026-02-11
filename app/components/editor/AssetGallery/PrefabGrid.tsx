import type { EntityPrefab } from "@slopcade/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#6366F1" />
			</View>
		);
	}

	if (prefabs.length === 0) {
		return (
			<View style={styles.emptyState}>
				<Text style={styles.emptyStateText}>No prefabs in this game</Text>
				<Text style={styles.emptyStateSubtext}>
					Add entities to your game to see them here
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.grid}>
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

const styles = StyleSheet.create({
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	loadingContainer: {
		padding: 20,
		alignItems: "center",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 40,
	},
	emptyStateText: {
		color: "#9CA3AF",
		fontSize: 16,
	},
	emptyStateSubtext: {
		color: "#6B7280",
		fontSize: 14,
		marginTop: 4,
	},
});
