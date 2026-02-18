import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useTheme } from "@/lib/theme";
import { useInspector } from "../inspector/InspectorProvider";

const isWeb = Platform.OS === "web";

export function HierarchyPanel() {
	const { editorColors: c } = useTheme();
	const { selectedEntityId, inspectMode, toggleInspectMode } = useInspector();
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<View style={[styles.container, { backgroundColor: c.panelBg }]}>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.title, { color: c.text }]}>Hierarchy</Text>
				</View>
			)}

			<View style={[styles.toolbar, { borderBottomColor: c.border }]}>
				<TextInput
					style={[
						styles.searchInput,
						{
							backgroundColor: c.inputBg,
							color: c.inputText,
							borderColor: c.inputBorder,
							borderWidth: 1,
						},
					]}
					placeholder="Search entities..."
					placeholderTextColor={c.inputPlaceholder}
					value={searchQuery}
					onChangeText={setSearchQuery}
					accessibilityLabel="Search entities"
				/>
				<Pressable
					style={[
						styles.inspectButton,
						{ backgroundColor: inspectMode ? c.accent : c.surfaceHover },
					]}
					onPress={toggleInspectMode}
					accessibilityRole="button"
					accessibilityLabel="Toggle inspect mode"
					accessibilityState={{ selected: inspectMode }}
				>
					<Ionicons
						name="scan-outline"
						size={14}
						color={inspectMode ? "#fff" : c.textSecondary}
					/>
				</Pressable>
			</View>

			<View style={styles.content}>
				<Text style={{ color: c.textSecondary, fontSize: 13 }}>
					Entity tree will appear here
				</Text>
				<Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>
					Selected: {selectedEntityId ?? "None"}
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
	},
	toolbar: {
		flexDirection: "row",
		alignItems: "center",
		padding: 8,
		gap: 6,
	},
	searchInput: {
		flex: 1,
		padding: 6,
		borderRadius: 6,
		fontSize: 13,
	},
	inspectButton: {
		width: 28,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 6,
	},
	content: {
		flex: 1,
		padding: 16,
		alignItems: "center",
		justifyContent: "center",
	},
});
