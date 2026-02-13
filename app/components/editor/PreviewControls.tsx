import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEditor } from "./EditorProvider";

export function PreviewControls() {
	const { timeMode, setTimeMode, mode, toggleMode } = useEditor();

	const handleTimeToggle = () => {
		const newMode = timeMode === "paused" ? "playing" : "paused";
		setTimeMode(newMode);
	};

	const handleModeToggle = () => {
		toggleMode();
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={[styles.button, mode === "live" && styles.activeButton]}
				onPress={handleModeToggle}
				activeOpacity={0.7}
			>
				<Ionicons
					name={mode === "live" ? "pencil" : "play-circle"}
					size={20}
					color="#FFFFFF"
				/>
				<Text style={styles.text}>{mode === "live" ? "Author" : "Live"}</Text>
			</TouchableOpacity>

			{mode === "author" && (
				<TouchableOpacity
					style={[styles.button, timeMode === "playing" && styles.activeButton]}
					onPress={handleTimeToggle}
					activeOpacity={0.7}
				>
					<Ionicons
						name={timeMode === "paused" ? "play" : "pause"}
						size={20}
						color="#FFFFFF"
					/>
					<Text style={styles.text}>
						{timeMode === "paused" ? "Play" : "Pause"}
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 16,
		right: 16,
		zIndex: 100,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.2)",
		gap: 8,
	},
	activeButton: {
		backgroundColor: "rgba(99, 102, 241, 0.8)",
		borderColor: "rgba(99, 102, 241, 1)",
	},
	text: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
});
