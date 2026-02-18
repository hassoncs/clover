import { PlatformBadge } from "@slopcade/shared-ui";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function SharedUiTestScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Shared UI Package Test</Text>
			<Text style={styles.subtitle}>
				The badge below comes from @slopcade/shared-ui
			</Text>
			<View style={styles.badgeContainer}>
				<PlatformBadge />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1a1a2e",
		padding: 24,
		paddingTop: 64,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: "#aaa",
		marginBottom: 24,
	},
	badgeContainer: {
		alignItems: "flex-start",
	},
});
