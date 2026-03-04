import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@slopcade/theme";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RuntimeNode } from "../../pen/runtime/scene-graph";
import { usePenRuntime } from "../PenRuntimeContext";

function getTypeIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
	switch (type) {
		case "frame":
			return "albums-outline";
		case "group":
			return "layers-outline";
		case "text":
			return "text-outline";
		case "rectangle":
			return "square-outline";
		case "ellipse":
			return "ellipse-outline";
		case "icon_font":
			return "star-outline";
		case "line":
			return "remove-outline";
		case "polygon":
			return "shapes-outline";
		case "path":
			return "git-network-outline";
		case "note":
			return "document-text-outline";
		default:
			return "apps-outline";
	}
}

function LayerItem({ node, depth = 0 }: { node: RuntimeNode; depth?: number }) {
	const { editorColors: c } = useTheme();
	const { graph, facade, selectedId, selectedIds, toggleSelectedId, setSelectedId, commitMutation, revision } =
		usePenRuntime();
	const [expanded, setExpanded] = useState(true);

	const isSelected = selectedIds.has(node.id) || selectedId === node.id;
	const hasChildren = node.childIds.length > 0;
	const children = node.childIds
		.map((id) => graph.getNode(id))
		.filter(Boolean) as RuntimeNode[];

	const toggleVisibility = () => {
		facade.updateNode(node.id, {
			visible: node.visible === false ? true : false,
		});
		commitMutation();
	};
	const moveUp = () => {
		if (!node.parentId) return;
		const parent = graph.getNode(node.parentId);
		if (!parent) return;
		const index = parent.childIds.indexOf(node.id);
		if (index > 0) {
			graph.reorderChild(node.id, node.parentId, index - 1);
			commitMutation();
		}
	};

	const moveDown = () => {
		if (!node.parentId) return;
		const parent = graph.getNode(node.parentId);
		if (!parent) return;
		const index = parent.childIds.indexOf(node.id);
		if (index < parent.childIds.length - 1) {
			graph.reorderChild(node.id, node.parentId, index + 1);
			commitMutation();
		}
	};

	return (
		<View>
			<Pressable
				onPress={(e) => {
					const isAdditive = (e as unknown as { shiftKey?: boolean }).shiftKey ?? false;
					toggleSelectedId(node.id, isAdditive);
				}}
				style={[
					styles.layerRow,
					{ paddingLeft: 8 + depth * 16 },
					isSelected && { backgroundColor: c.surfaceHover },
				]}
			>
				<Pressable
					onPress={() => hasChildren && setExpanded(!expanded)}
					style={styles.layerChevron}
					hitSlop={4}
				>
					{hasChildren ? (
						<Ionicons
							name={expanded ? "chevron-down" : "chevron-forward"}
							size={10}
							color={c.textSecondary}
						/>
					) : (
						<View style={{ width: 10 }} />
					)}
				</Pressable>
				<Ionicons
					name={getTypeIcon(node.type)}
					size={12}
					color={isSelected ? c.text : c.textSecondary}
					style={styles.layerTypeIcon}
				/>
				<Text
					style={[
						styles.layerName,
						{ color: isSelected ? c.text : c.textSecondary },
						node.visible === false && { opacity: 0.5 },
					]}
					numberOfLines={1}
				>
					{node.name || node.id}
				</Text>
				<Pressable onPress={moveUp} style={styles.visibilityBtn}>
					<Ionicons name="chevron-up" size={12} color={c.textSecondary} />
				</Pressable>
				<Pressable onPress={moveDown} style={styles.visibilityBtn}>
					<Ionicons name="chevron-down" size={12} color={c.textSecondary} />
				</Pressable>
				<Pressable onPress={toggleVisibility} style={styles.visibilityBtn}>
					<Ionicons
						name={node.visible === false ? "eye-off-outline" : "eye-outline"}
						size={12}
						color={c.textSecondary}
					/>
				</Pressable>
			</Pressable>

			{hasChildren && expanded && (
				<View>
					{children.map((child) => (
						<LayerItem key={child.id} node={child} depth={depth + 1} />
					))}
				</View>
			)}
		</View>
	);
}

export function LayersPanel() {
	const { editorColors: c } = useTheme();
	const { graph, revision } = usePenRuntime();

	const root = graph.getNode(graph.rootId);
	const children =
		(root?.childIds
			.map((id) => graph.getNode(id))
			.filter(Boolean) as RuntimeNode[]) || [];

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: c.panelBg, borderRightColor: c.border },
			]}
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>LAYERS</Text>
			</View>
			<ScrollView style={styles.content}>
				{children.map((child) => (
					<LayerItem key={child.id} node={child} />
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 240,
		borderRightWidth: 1,
		flex: 1,
	},
	header: {
		padding: 12,
		borderBottomWidth: 1,
		height: 48,
		justifyContent: "center",
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	content: {
		flex: 1,
		paddingVertical: 8,
	},
	layerRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 6,
		paddingRight: 8,
		gap: 4,
	},
	layerChevron: {
		width: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	layerTypeIcon: {
		marginRight: 4,
	},
	layerName: {
		fontSize: 12,
		flex: 1,
	},
	visibilityBtn: {
		padding: 2,
		opacity: 0.5,
	},
});
