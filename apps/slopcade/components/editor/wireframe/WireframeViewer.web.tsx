import React from "react";
import { StyleSheet, View } from "react-native";
import { useEditor } from "../EditorProvider";
import { useWireframeMode } from "./WireframeModeProvider";
import { WireframeRenderer } from "./WireframeRenderer";

export function WireframeViewer() {
	const { document } = useEditor();
	const { mode, previewConfig } = useWireframeMode();

	const [w, h] = previewConfig.aspectRatio.split(":").map(Number);
	const aspectRatio = w / h;

	return (
		<View style={styles.container}>
			<View style={[styles.phoneFrame, { aspectRatio }]}>
				<WireframeRenderer document={document} mode={mode} />
			</View>
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
	phoneFrame: {
		width: "100%",
		maxHeight: "100%",
		maxWidth: 400,
		borderWidth: 12,
		borderColor: "#1a1a1a",
		borderRadius: 32,
		overflow: "hidden",
		backgroundColor: "#fff",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.2,
		shadowRadius: 20,
		elevation: 5,
	},
});
