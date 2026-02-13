import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AudioPreview } from "./AudioPreview";
import { ImagePreview } from "./ImagePreview";
import { getFileType } from "./utils";

interface BinaryPreviewPanelProps {
	filename: string;
}

export function BinaryPreviewPanel({ filename }: BinaryPreviewPanelProps) {
	const fileType = getFileType(filename);

	if (fileType === "audio") {
		return <AudioPreview filename={filename} />;
	}

	if (fileType === "image") {
		return <ImagePreview filename={filename} />;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.text}>Unsupported binary file type</Text>
			<Text style={styles.subtext}>{filename}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#1F2937",
	},
	text: {
		color: "#F3F4F6",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
	},
	subtext: {
		color: "#9CA3AF",
		fontSize: 14,
	},
});
