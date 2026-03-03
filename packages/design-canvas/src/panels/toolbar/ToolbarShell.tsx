import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@slopcade/theme";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePenRuntime } from "../PenRuntimeContext";

const TOOLS = [
	{ id: "pointer", icon: "navigate-outline" },
	{ id: "frame", icon: "albums-outline" },
	{ id: "rectangle", icon: "square-outline" },
	{ id: "ellipse", icon: "ellipse-outline" },
	{ id: "text", icon: "text-outline" },
	{ id: "line", icon: "remove-outline" },
	{ id: "pen", icon: "pencil-outline" },
] as const;

export function ToolbarShell() {
	const { editorColors: c } = useTheme();
	const { activeTool, setActiveTool } = usePenRuntime();

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: c.surface, borderColor: c.border },
			]}
		>
			{TOOLS.map((tool) => {
				const isActive = activeTool === tool.id;
				return (
					<Pressable
						key={tool.id}
						onPress={() => setActiveTool(tool.id)}
						style={[
							styles.toolButton,
							isActive && { backgroundColor: c.surfaceHover },
						]}
					>
						<Ionicons
							name={tool.icon as any}
							size={16}
							color={isActive ? "#818cf8" : c.textSecondary}
						/>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 16,
		left: "50%",
		transform: [{ translateX: -140 }], // approx half width
		flexDirection: "row",
		padding: 4,
		borderRadius: 8,
		borderWidth: 1,
		gap: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5,
		zIndex: 100,
	},
	toolButton: {
		width: 32,
		height: 32,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
});
