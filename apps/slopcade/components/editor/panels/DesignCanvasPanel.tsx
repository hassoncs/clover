import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

export function DesignCanvasPanel() {
	const { editorColors: c } = useTheme();

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Design Canvas Panel"
			testID="editor-design-canvas-panel"
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>DESIGN CANVAS</Text>
			</View>

			<View style={styles.content}>
				<ActivityIndicator
					size="large"
					color={c.accent}
					style={styles.spinner}
				/>
				<Text style={[styles.message, { color: c.textSecondary }]}>
					Design Canvas — coming soon
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
		height: 48,
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	content: {
		flex: 1,
		padding: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	spinner: {
		marginBottom: 16,
	},
	message: {
		fontSize: 14,
		fontWeight: "500",
		textAlign: "center",
	},
});
