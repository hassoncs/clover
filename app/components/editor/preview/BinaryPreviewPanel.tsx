import React from "react";
import { Text, View } from "react-native";
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
		<View className="flex-1 items-center justify-center bg-secondary-800">
			<Text className="text-secondary-100 text-base font-semibold mb-2">
				Unsupported binary file type
			</Text>
			<Text className="text-secondary-400 text-sm">{filename}</Text>
		</View>
	);
}
