import { useEffect, useRef } from "react";
import {
	Animated,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface GameDialogProps {
	visible: boolean;
	title: string;
	message?: string;
	stats?: Array<{ label: string; value: string }>;
	buttons: Array<{
		label: string;
		onPress: () => void;
		variant?: "primary" | "secondary";
	}>;
	onClose?: () => void;
}

export function GameDialog({
	visible,
	title,
	message,
	stats,
	buttons,
	onClose,
}: GameDialogProps) {
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			fadeAnim.setValue(0);
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: Platform.OS !== "web",
			}).start();
		}
	}, [visible, fadeAnim]);

	return (
		<Modal
			transparent
			visible={visible}
			animationType="none"
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
				<View style={styles.container}>
					<Text style={styles.title}>{title}</Text>

					{message && <Text style={styles.message}>{message}</Text>}

					{stats && stats.length > 0 && (
						<View style={styles.statsContainer}>
							{stats.map((stat) => (
								<Text key={stat.label} style={styles.statText}>
									{stat.label}: {stat.value}
								</Text>
							))}
						</View>
					)}

					<View style={styles.buttonContainer}>
						{buttons.map((button, index) => (
							<TouchableOpacity
								key={button.label}
								style={[
									styles.button,
									button.variant === "secondary"
										? styles.secondaryButton
										: null,
									index > 0 ? styles.buttonMargin : null,
								]}
								onPress={button.onPress}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel={button.label}
							>
								<Text style={styles.buttonText}>{button.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		width: "100%",
		alignItems: "center",
		paddingHorizontal: 20,
	},
	title: {
		color: "#fff",
		fontSize: 36,
		fontWeight: "bold",
		marginBottom: 12,
		textAlign: "center",
		textShadowColor: "rgba(0, 0, 0, 0.75)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	message: {
		color: "#ccc",
		fontSize: 18,
		textAlign: "center",
		marginBottom: 24,
		paddingHorizontal: 30,
		lineHeight: 24,
		textShadowColor: "rgba(0, 0, 0, 0.75)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	statsContainer: {
		marginBottom: 30,
		alignItems: "center",
	},
	statText: {
		color: "#fff",
		fontSize: 24,
		marginBottom: 5,
		textShadowColor: "rgba(0, 0, 0, 0.75)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	buttonContainer: {
		alignItems: "center",
		width: "100%",
	},
	button: {
		backgroundColor: "#C9A84C",
		paddingHorizontal: 40,
		paddingVertical: 15,
		borderRadius: 10,
		minWidth: 200,
		alignItems: "center",
		elevation: 5,
		boxShadow: "0px 2px 3.84px rgba(0, 0, 0, 0.25)",
	},
	secondaryButton: {
		backgroundColor: "#6B7280",
	},
	buttonMargin: {
		marginTop: 12,
	},
	buttonText: {
		color: "#FDF8F0",
		fontSize: 20,
		fontWeight: "bold",
	},
});
