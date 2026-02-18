import { StyleSheet, Text, View } from "react-native";

export function PlatformBadge() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Running on Native</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 12,
		backgroundColor: "#10b981",
		borderRadius: 8,
	},
	text: {
		color: "white",
		fontWeight: "bold",
	},
});
