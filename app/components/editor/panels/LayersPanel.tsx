import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEditor } from "../EditorProvider";

export function LayersPanel() {
	const { document, selectedEntityId, selectEntity } = useEditor();

	const entities = document.entities;

	if (entities.length === 0) {
		return (
			<View style={styles.emptyState}>
				<Text style={styles.emptyText}>No entities in this game</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerText}>LAYERS</Text>
				<Text style={styles.countText}>{entities.length} entities</Text>
			</View>

			<ScrollView style={styles.list}>
				{entities.map((entity, index) => {
					const isSelected = entity.id === selectedEntityId;
					const prefab = entity.prefab ? document.prefabs[entity.prefab] : null;
					const displayName = entity.name || entity.prefab || entity.id;

					return (
						<Pressable
							key={entity.id}
							style={[styles.layerRow, isSelected && styles.layerRowSelected]}
							onPress={() => selectEntity(entity.id)}
							accessibilityRole="button"
							accessibilityLabel={`Select entity ${displayName}`}
							accessibilityState={{ selected: isSelected }}
						>
							<View style={styles.layerInfo}>
								<View
									style={[
										styles.checkbox,
										isSelected && styles.checkboxChecked,
									]}
								>
									{isSelected && <Text style={styles.checkmark}>✓</Text>}
								</View>

								<Text style={styles.visibilityIcon}>👁</Text>

								<Text style={styles.lockIcon}>🔓</Text>

								<View style={styles.entityDetails}>
									<Text style={styles.entityName} numberOfLines={1}>
										{displayName}
									</Text>
									{prefab && (
										<Text style={styles.entityType}>
											{prefab.collider?.shape || "entity"}
										</Text>
									)}
								</View>
							</View>

							<Text style={styles.dragHandle}>≡</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	headerText: {
		color: "#9CA3AF",
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1,
	},
	countText: {
		color: "#6B7280",
		fontSize: 12,
	},
	list: {
		flex: 1,
	},
	layerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "#374151",
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	layerRowSelected: {
		backgroundColor: "#4F46E5",
	},
	layerInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: "#6B7280",
		marginRight: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	checkboxChecked: {
		backgroundColor: "#6366F1",
		borderColor: "#6366F1",
	},
	checkmark: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "bold",
	},
	visibilityIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	lockIcon: {
		fontSize: 16,
		marginRight: 12,
	},
	entityDetails: {
		flex: 1,
	},
	entityName: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "500",
	},
	entityType: {
		color: "#9CA3AF",
		fontSize: 12,
		marginTop: 2,
	},
	dragHandle: {
		color: "#6B7280",
		fontSize: 18,
		paddingLeft: 8,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
	},
	emptyText: {
		color: "#6B7280",
		fontSize: 14,
	},
});
