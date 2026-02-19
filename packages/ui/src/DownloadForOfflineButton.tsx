import { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
	gameId: string;
	size?: "sm" | "md" | "lg";
	onDownload: (
		gameId: string,
		onProgress: (downloaded: number, total: number) => void,
	) => Promise<void>;
	onDelete: (gameId: string) => Promise<void>;
	onCheckDownloaded: (gameId: string) => Promise<boolean>;
}

export function DownloadForOfflineButton({
	gameId,
	size = "md",
	onDownload,
	onDelete,
	onCheckDownloaded,
}: Props) {
	const [status, setStatus] = useState<"idle" | "downloading" | "downloaded">(
		"idle",
	);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const checkStatus = async () => {
			if (Platform.OS === "web") return;
			const downloaded = await onCheckDownloaded(gameId);
			setStatus(downloaded ? "downloaded" : "idle");
		};
		checkStatus();
	}, [gameId, onCheckDownloaded]);

	const handleDownload = async () => {
		if (Platform.OS === "web") {
			Alert.alert("Not Supported", "Offline downloads are not supported on web.");
			return;
		}

		try {
			setStatus("downloading");
			setProgress(0);

			await onDownload(gameId, (downloaded: number, total: number) => {
				setProgress(downloaded / total);
			});

			setStatus("downloaded");
		} catch (error) {
			console.error("Download failed:", error);
			Alert.alert("Download Failed", "Could not download game for offline play.");
			setStatus("idle");
		}
	};

	const handleDelete = async () => {
		Alert.alert(
			"Remove Download",
			"Are you sure you want to remove this game from offline storage?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						try {
							await onDelete(gameId);
							setStatus("idle");
						} catch (error) {
							console.error("Delete failed:", error);
							Alert.alert("Error", "Could not remove game.");
						}
					},
				},
			],
		);
	};

	if (Platform.OS === "web") return null;

	const iconSize = size === "sm" ? 16 : size === "lg" ? 28 : 24;

	if (status === "downloading") {
		return (
			<View className="flex-row items-center gap-2">
				<ActivityIndicator size="small" color="#007AFF" />
				<Text className="text-xs text-gray-500">
					{Math.round(progress * 100)}%
				</Text>
			</View>
		);
	}

	if (status === "downloaded") {
		return (
			<TouchableOpacity
				onPress={handleDelete}
				className="flex-row items-center gap-1 bg-green-100 px-2 py-1 rounded-full"
				accessibilityRole="button"
				accessibilityLabel="Remove download"
			>
				<Ionicons name="checkmark-circle" size={iconSize} color="#34C759" />
				{size !== "sm" && (
					<Text className="text-green-700 text-xs font-medium">Downloaded</Text>
				)}
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={handleDownload}
			className="flex-row items-center gap-1 bg-gray-100 px-2 py-1 rounded-full"
			accessibilityRole="button"
			accessibilityLabel="Download for offline"
		>
			<Ionicons name="cloud-download-outline" size={iconSize} color="#007AFF" />
			{size !== "sm" && (
				<Text className="text-blue-600 text-xs font-medium">Download</Text>
			)}
		</TouchableOpacity>
	);
}
