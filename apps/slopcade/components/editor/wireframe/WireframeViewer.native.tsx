import type React from "react";
import { StyleSheet, Text, View } from "react-native";

interface WireframeViewerProps {
	children?: React.ReactNode;
}

export function WireframeViewer({ children }: WireframeViewerProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Wireframe viewer not available on native</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#f0f0f0",
	},
	text: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 20,
	},
});
