import { Pressable, ScrollView, Text, View } from "react-native";
import { useEditor } from "../EditorProvider";

export function LayersPanel() {
	const { document, selectedEntityId, selectEntity } = useEditor();

	const entities = document.entities;

	if (entities.length === 0) {
		return (
			<View className="flex-1 justify-center items-center p-8">
				<Text className="text-secondary-500 text-sm">
					No entities in this game
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 p-4">
			<View className="flex-row justify-between items-center mb-3">
				<Text className="text-secondary-400 text-xs font-semibold tracking-widest">
					LAYERS
				</Text>
				<Text className="text-secondary-500 text-xs">
					{entities.length} entities
				</Text>
			</View>

			<ScrollView className="flex-1">
				{entities.map((entity, index) => {
					const isSelected = entity.id === selectedEntityId;
					const prefab = entity.prefab ? document.prefabs[entity.prefab] : null;
					const displayName = entity.name || entity.prefab || entity.id;

					return (
						<Pressable
							key={entity.id}
							className={`flex-row items-center justify-between bg-secondary-700 rounded-lg p-3 mb-2 ${isSelected ? "" : ""}`}
							style={isSelected ? { backgroundColor: "#4F46E5" } : undefined}
							onPress={() => selectEntity(entity.id)}
							accessibilityRole="button"
							accessibilityLabel={`Select entity ${displayName}`}
							accessibilityState={{ selected: isSelected }}
						>
							<View className="flex-row items-center flex-1">
								<View
									className={`w-5 h-5 rounded border-2 mr-2.5 justify-center items-center ${isSelected ? "" : ""}`}
									style={
										isSelected
											? { backgroundColor: "#6366F1", borderColor: "#6366F1" }
											: { borderColor: "#6B7280" }
									}
								>
									{isSelected && (
										<Text className="text-white text-xs font-bold">✓</Text>
									)}
								</View>

								<Text className="text-base mr-2">👁</Text>

								<Text className="text-base mr-3">🔓</Text>

								<View className="flex-1">
									<Text
										className="text-white text-sm font-medium"
										numberOfLines={1}
									>
										{displayName}
									</Text>
									{prefab && (
										<Text className="text-secondary-400 text-xs mt-0.5">
											{prefab.collider?.shape || "entity"}
										</Text>
									)}
								</View>
							</View>

							<Text className="text-secondary-500 text-lg pl-2">≡</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}
