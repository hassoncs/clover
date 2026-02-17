import type React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
	FloatingElement,
	GlowIcon,
	ShimmerSurface,
	SparkleWrapper,
} from "../animation";
import { AmenIcon } from "../icons";

interface AmenLoadingScreenProps {
	progress?: number;
	message?: string;
	verse?: string;
}

export const AmenLoadingScreen: React.FC<AmenLoadingScreenProps> = ({
	progress,
	message = "Loading game...",
	verse,
}) => {
	return (
		<View style={styles.container}>
			<View style={styles.centerContent}>
				<FloatingElement>
					<SparkleWrapper count={5}>
						<GlowIcon color="#C9A84C" intensity={0.8}>
							<AmenIcon name="cross" size={64} color="#C9A84C" />
						</GlowIcon>
					</SparkleWrapper>
				</FloatingElement>

				<View style={styles.progressContainer}>
					<ShimmerSurface
						width={200}
						height={8}
						borderRadius={4}
						baseColor="rgba(201, 168, 76, 0.2)"
						shimmerColor="rgba(255, 215, 0, 0.4)"
					>
						{progress !== undefined && (
							<View
								style={{
									width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
									height: "100%",
									backgroundColor: "#C9A84C",
									borderRadius: 4,
								}}
							/>
						)}
					</ShimmerSurface>
				</View>

				{message && <Text style={styles.message}>{message}</Text>}
			</View>

			{verse && <Text style={styles.verse}>{verse}</Text>}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFDF7",
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	centerContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	progressContainer: {
		marginTop: 48,
	},
	message: {
		marginTop: 16,
		fontFamily: "serif",
		fontSize: 14,
		color: "#8A7E5E",
		letterSpacing: 0.5,
	},
	verse: {
		position: "absolute",
		bottom: 48,
		fontFamily: "serif",
		fontStyle: "italic",
		fontSize: 12,
		color: "#C9A84C",
		textAlign: "center",
		opacity: 0.8,
		maxWidth: 300,
	},
});
