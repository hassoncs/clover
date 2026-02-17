import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

export function WireframePanel() {
	const { editorColors: c } = useTheme();
	const [isProductionMode, setIsProductionMode] = useState(false);

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Wireframe Panel"
			testID="editor-wireframe-panel"
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>WIREFRAME</Text>
				<Pressable
					onPress={() => setIsProductionMode(!isProductionMode)}
					style={({ pressed }) => [
						styles.modeToggle,
						{
							backgroundColor: isProductionMode ? c.accent : c.surfaceHover,
							opacity: pressed ? 0.8 : 1,
						},
					]}
					accessibilityRole="button"
					accessibilityLabel={
						isProductionMode
							? "Switch to Structural Mode"
							: "Switch to Production Mode"
					}
				>
					<Ionicons
						name={isProductionMode ? "eye" : "construct-outline"}
						size={14}
						color={isProductionMode ? "#fff" : c.text}
						style={{ marginRight: 4 }}
					/>
					<Text
						style={[
							styles.modeText,
							{ color: isProductionMode ? "#fff" : c.text },
						]}
					>
						{isProductionMode ? "Production" : "Structural"}
					</Text>
				</Pressable>
			</View>

			<View style={styles.content}>
				<View
					style={[
						styles.placeholder,
						{
							borderColor: c.border,
							backgroundColor: c.surface,
						},
					]}
				>
					<Ionicons
						name="phone-portrait-outline"
						size={48}
						color={c.textSecondary}
						style={{ marginBottom: 16 }}
					/>
					<Text style={[styles.placeholderText, { color: c.textSecondary }]}>
						Wireframe Viewer
					</Text>
					<Text style={[styles.subText, { color: c.textSecondary }]}>
						{isProductionMode
							? "Production preview mode active"
							: "Structural wireframe mode active"}
					</Text>
				</View>
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
		height: 48,
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	modeToggle: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	modeText: {
		fontSize: 11,
		fontWeight: "500",
	},
	content: {
		flex: 1,
		padding: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	placeholder: {
		width: "100%",
		height: "100%",
		borderWidth: 1,
		borderStyle: "dashed",
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderText: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
	},
	subText: {
		fontSize: 12,
	},
});
