import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { env } from "@/lib/config/env";
import {
	deleteOfflineGame,
	downloadGameForOffline,
	isGameDownloaded,
} from "@/lib/offline/download-manager";

interface Props {
	gameId: string;
	size?: "sm" | "md" | "lg";
}

export function DownloadForOfflineButton({ gameId, size = "md" }: Props) {
	const [status, setStatus] = useState<"idle" | "downloading" | "downloaded">(
		"idle",
	);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const checkStatus = async () => {
			if (Platform.OS === "web") return;
			const downloaded = await isGameDownloaded(gameId);
			setStatus(downloaded ? "downloaded" : "idle");
		};
		checkStatus();
	}, [gameId]);

	const handleDownload = async () => {
		if (Platform.OS === "web") {
			Alert.alert(
				"Not Supported",
				"Offline downloads are not supported on web.",
			);
			return;
		}

		try {
			setStatus("downloading");
			setProgress(0);

			await downloadGameForOffline(
				gameId,
				env.assetCdnUrl,
				(downloaded: number, total: number) => {
					setProgress(downloaded / total);
				},
			);

			setStatus("downloaded");
		} catch (error) {
			console.error("Download failed:", error);
			Alert.alert(
				"Download Failed",
				"Could not download game for offline play.",
			);
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
							await deleteOfflineGame(gameId);
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
				<ActivityIndicator size="small" color="#C9A84C" />
				<Text className="text-xs text-theme-text-tertiary">
					{Math.round(progress * 100)}%
				</Text>
			</View>
		);
	}

	if (status === "downloaded") {
		return (
			<TouchableOpacity
				onPress={handleDelete}
				className="flex-row items-center gap-1 bg-theme-success/20 px-2 py-1 rounded-full"
				accessibilityRole="button"
				accessibilityLabel="Remove download"
			>
				<Ionicons name="checkmark-circle" size={iconSize} color="#5B7F3B" />
				{size !== "sm" && (
					<Text className="text-theme-success text-xs font-medium">
						Downloaded
					</Text>
				)}
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={handleDownload}
			className="flex-row items-center gap-1 bg-theme-surface-elevated px-2 py-1 rounded-full"
			accessibilityRole="button"
			accessibilityLabel="Download for offline"
		>
			<Ionicons name="cloud-download-outline" size={iconSize} color="#C9A84C" />
			{size !== "sm" && (
				<Text className="text-theme-primary text-xs font-medium">Download</Text>
			)}
		</TouchableOpacity>
	);
}
