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

const RIGHT_PANELS = [
	{ id: "inspector", icon: "options-outline" },
	{ id: "variables", icon: "code-slash-outline" },
	{ id: "components", icon: "copy-outline" },
] as const;

export function ToolbarShell() {
	const { editorColors: c } = useTheme();
	const { activeTool, setActiveTool, activeRightPanel, setActiveRightPanel } = usePenRuntime();

	return (
		<View style={styles.wrapper}>
			{/* Left: drawing tools */}
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
								name={tool.icon}
								size={16}
								color={isActive ? "#818cf8" : c.textSecondary}
							/>
						</Pressable>
					);
				})}
			</View>

			{/* Right: panel toggles */}
			<View
				style={[
					styles.container,
					{ backgroundColor: c.surface, borderColor: c.border },
				]}
			>
				{RIGHT_PANELS.map((panel) => {
					const isActive = activeRightPanel === panel.id;
					return (
						<Pressable
							key={panel.id}
							onPress={() => setActiveRightPanel(panel.id as "inspector" | "variables" | "components")}
							style={[
								styles.toolButton,
								isActive && { backgroundColor: c.surfaceHover },
							]}
						>
							<Ionicons
								name={panel.icon}
								size={16}
								color={isActive ? "#818cf8" : c.textSecondary}
							/>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		top: 16,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		zIndex: 100,
		pointerEvents: "box-none",
	},
	container: {
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
	},
	toolButton: {
		width: 32,
		height: 32,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
});
