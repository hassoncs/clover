import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { getAssetUrl } from "./utils";

interface AudioPreviewProps {
	filename: string;
}

export function AudioPreview({ filename }: AudioPreviewProps) {
	const [sound, setSound] = useState<Audio.Sound | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState<number | null>(null);
	const [position, setPosition] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const isMounted = useRef(true);

	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		let soundObject: Audio.Sound | null = null;

		const onPlaybackStatusUpdate = (status: any) => {
			if (!isMounted.current) return;

			if (status.isLoaded) {
				setPosition(status.positionMillis);
				setDuration(status.durationMillis || 0);
				setIsPlaying(status.isPlaying);

				if (status.didJustFinish) {
					setIsPlaying(false);
					setPosition(0);
				}
			} else if (status.error) {
				console.error(`Playback error: ${status.error}`);
				setError(`Playback error: ${status.error}`);
			}
		};

		async function loadSound() {
			try {
				setIsLoading(true);
				setError(null);

				const uri = getAssetUrl(filename);
				console.log(`Loading audio from: ${uri}`);

				const { sound: newSound, status } = await Audio.Sound.createAsync(
					{ uri },
					{ shouldPlay: false },
					onPlaybackStatusUpdate,
				);

				soundObject = newSound;

				if (isMounted.current) {
					setSound(newSound);
					if (status.isLoaded) {
						setDuration(status.durationMillis || 0);
					}
					setIsLoading(false);
				}
			} catch (err) {
				console.error("Error loading sound:", err);
				if (isMounted.current) {
					setError("Failed to load audio file");
					setIsLoading(false);
				}
			}
		}

		loadSound();

		return () => {
			if (soundObject) {
				soundObject.unloadAsync();
			}
		};
	}, [filename]);

	const handlePlayPause = async () => {
		if (!sound) return;

		try {
			if (isPlaying) {
				await sound.pauseAsync();
			} else {
				if (position >= (duration || 0) && (duration || 0) > 0) {
					await sound.replayAsync();
				} else {
					await sound.playAsync();
				}
			}
		} catch (err) {
			console.error("Error toggling playback:", err);
		}
	};

	const formatTime = (millis: number) => {
		const totalSeconds = Math.floor(millis / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	if (error) {
		return (
			<View style={styles.container}>
				<Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
				<Text style={styles.errorText}>{error}</Text>
				<Text style={styles.filename}>{filename}</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<View style={styles.iconContainer}>
					<Ionicons name="musical-note" size={64} color="#6366F1" />
				</View>

				<Text style={styles.filename} numberOfLines={1}>
					{filename.split("/").pop()}
				</Text>
				<Text style={styles.fullPath} numberOfLines={1}>
					{filename}
				</Text>

				{isLoading ? (
					<ActivityIndicator
						size="large"
						color="#6366F1"
						style={styles.loader}
					/>
				) : (
					<View style={styles.controls}>
						<Text style={styles.timeText}>{formatTime(position)}</Text>

						<TouchableOpacity
							style={styles.playButton}
							onPress={handlePlayPause}
							activeOpacity={0.7}
						>
							<Ionicons
								name={isPlaying ? "pause" : "play"}
								size={32}
								color="#FFFFFF"
								style={{ marginLeft: isPlaying ? 0 : 4 }}
							/>
						</TouchableOpacity>

						<Text style={styles.timeText}>
							{duration ? formatTime(duration) : "--:--"}
						</Text>
					</View>
				)}

				{!isLoading && duration && duration > 0 && (
					<View style={styles.progressBarContainer}>
						<View
							style={[
								styles.progressBarFill,
								{ width: `${(position / duration) * 100}%` },
							]}
						/>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#1F2937",
		padding: 20,
	},
	card: {
		backgroundColor: "#111827",
		borderRadius: 16,
		padding: 32,
		alignItems: "center",
		width: "100%",
		maxWidth: 400,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 5,
	},
	iconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "#3730A3",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
		borderWidth: 2,
		borderColor: "#4F46E5",
	},
	filename: {
		fontSize: 18,
		fontWeight: "600",
		color: "#F3F4F6",
		marginBottom: 8,
		textAlign: "center",
	},
	fullPath: {
		fontSize: 12,
		color: "#9CA3AF",
		marginBottom: 32,
		textAlign: "center",
	},
	controls: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		width: "100%",
		marginBottom: 16,
	},
	playButton: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#6366F1",
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 24,
	},
	timeText: {
		fontFamily: "monospace",
		color: "#D1D5DB",
		fontSize: 14,
		width: 50,
		textAlign: "center",
	},
	progressBarContainer: {
		width: "100%",
		height: 4,
		backgroundColor: "#374151",
		borderRadius: 2,
		overflow: "hidden",
	},
	progressBarFill: {
		height: "100%",
		backgroundColor: "#818CF8",
	},
	loader: {
		marginVertical: 20,
	},
	errorText: {
		color: "#EF4444",
		fontSize: 16,
		marginTop: 16,
		marginBottom: 8,
		textAlign: "center",
	},
});
