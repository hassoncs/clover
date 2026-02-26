import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@slopcade/theme";

export interface ActivityBarItem {
	id: string;
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
}

const ACTIVITY_ITEMS: ActivityBarItem[] = [
	{ id: "explorer", icon: "document-text-outline", label: "Explorer" },
	{ id: "hierarchy", icon: "git-branch-outline", label: "Hierarchy" },
	{ id: "properties", icon: "options-outline", label: "Properties" },
	{ id: "debug", icon: "bug-outline", label: "Debug" },
	{ id: "assets", icon: "images-outline", label: "Assets" },
	{ id: "layers", icon: "layers-outline", label: "Layers" },
	{ id: "images", icon: "color-palette-outline", label: "Images" },
];

const BOTTOM_ITEMS: ActivityBarItem[] = [
	{ id: "chat", icon: "chatbubble-ellipses-outline", label: "Chat" },
	{ id: "wireframe", icon: "phone-portrait-outline", label: "Wireframe" },
	{ id: "diagnostics", icon: "warning-outline", label: "Diagnostics" },
];

interface ActivityBarProps {
	activePanel: string | null;
	onPanelToggle: (panelId: string) => void;
}

export function ActivityBar({ activePanel, onPanelToggle }: ActivityBarProps) {
	const { editorColors } = useTheme();

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: editorColors.activityBarBg,
					borderRightColor: editorColors.border,
				},
			]}
		>
			<View style={styles.topSection}>
				{ACTIVITY_ITEMS.map((item) => {
					const isActive = activePanel === item.id;
					return (
						<Pressable
							key={item.id}
							onPress={() => onPanelToggle(item.id)}
							style={({ pressed }) => [
								styles.iconButton,
								isActive && {
									borderLeftColor: editorColors.activityBarIndicator,
									borderLeftWidth: 2,
								},
								pressed && { backgroundColor: editorColors.surfaceHover },
							]}
							accessibilityRole="button"
							accessibilityLabel={item.label}
							accessibilityState={{ selected: isActive }}
						>
							<Ionicons
								name={item.icon}
								size={22}
								color={
									isActive
										? editorColors.activityBarIconActive
										: editorColors.activityBarIcon
								}
							/>
						</Pressable>
					);
				})}
			</View>

			<View style={styles.bottomSection}>
				{BOTTOM_ITEMS.map((item) => {
					const isActive = activePanel === item.id;
					return (
						<Pressable
							key={item.id}
							onPress={() => onPanelToggle(item.id)}
							style={({ pressed }) => [
								styles.iconButton,
								isActive && {
									borderLeftColor: editorColors.activityBarIndicator,
									borderLeftWidth: 2,
								},
								pressed && { backgroundColor: editorColors.surfaceHover },
							]}
							accessibilityRole="button"
							accessibilityLabel={item.label}
							accessibilityState={{ selected: isActive }}
						>
							<Ionicons
								name={item.icon}
								size={22}
								color={
									isActive
										? editorColors.activityBarIconActive
										: editorColors.activityBarIcon
								}
							/>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 48,
		borderRightWidth: 1,
		justifyContent: "space-between",
	},
	topSection: {
		paddingTop: 4,
	},
	bottomSection: {
		paddingBottom: 4,
	},
	iconButton: {
		width: 48,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderLeftWidth: 2,
		borderLeftColor: "transparent",
	},
});
