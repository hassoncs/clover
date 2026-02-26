import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@slopcade/theme";
import { WireframeViewer } from "../wireframe";

function WireframePanelContent() {
	const { editorColors: c } = useTheme();
	const mode = "structural";
	const toggleMode = () => {};
	const selectedScreenIndex = 0;
	const setSelectedScreenIndex = (_index: number) => {};
	const totalScreens = 1;
	const isProductionMode = false;

	useEffect(() => {
		if (Platform.OS !== "web") return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA"
			) {
				return;
			}

			if (e.key === "ArrowLeft") {
				setSelectedScreenIndex(Math.max(0, selectedScreenIndex - 1));
			}
			if (e.key === "ArrowRight") {
				setSelectedScreenIndex(
					Math.min(totalScreens - 1, selectedScreenIndex + 1),
				);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const goPrev = () =>
		setSelectedScreenIndex(Math.max(0, selectedScreenIndex - 1));
	const goNext = () =>
		setSelectedScreenIndex(Math.min(totalScreens - 1, selectedScreenIndex + 1));

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Wireframe Panel"
			testID="editor-wireframe-panel"
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>WIREFRAME</Text>
				<View style={styles.headerRight}>
					{totalScreens > 1 && (
						<View style={[styles.navControls, { backgroundColor: c.surface }]}>
							<Pressable
								onPress={goPrev}
								disabled={selectedScreenIndex === 0}
								style={({ pressed }) => [
									styles.navButton,
									{ opacity: pressed || selectedScreenIndex === 0 ? 0.3 : 1 },
								]}
							>
								<Ionicons name="chevron-back" size={14} color={c.text} />
							</Pressable>
							<Text style={[styles.counterText, { color: c.textSecondary }]}>
								{selectedScreenIndex + 1} / {totalScreens}
							</Text>
							<Pressable
								onPress={goNext}
								disabled={selectedScreenIndex === totalScreens - 1}
								style={({ pressed }) => [
									styles.navButton,
									{
										opacity:
											pressed || selectedScreenIndex === totalScreens - 1
												? 0.3
												: 1,
									},
								]}
							>
								<Ionicons name="chevron-forward" size={14} color={c.text} />
							</Pressable>
						</View>
					)}
					<Pressable
						onPress={toggleMode}
						style={({ pressed }) => [
							styles.modeToggle,
							{
								backgroundColor: isProductionMode ? c.accent : c.surfaceHover,
								opacity: pressed ? 0.8 : 1,
							},
						]}
						accessibilityRole="button"
						accessibilityLabel={
							isProductionMode
								? "Switch to Structural Mode"
								: "Switch to Production Mode"
						}
					>
						<Ionicons
							name={isProductionMode ? "eye" : "construct-outline"}
							size={14}
							color={isProductionMode ? "#fff" : c.text}
							style={{ marginRight: 4 }}
						/>
						<Text
							style={[
								styles.modeText,
								{ color: isProductionMode ? "#fff" : c.text },
							]}
						>
							{isProductionMode ? "Production" : "Structural"}
						</Text>
					</Pressable>
				</View>
			</View>

			<View style={styles.content}>
				<WireframeViewer />
			</View>
		</View>
	);
}

export function WireframePanel() {
	return <WireframePanelContent />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
		height: 48,
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	modeToggle: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	modeText: {
		fontSize: 11,
		fontWeight: "500",
	},
	content: {
		flex: 1,
		padding: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	navControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		borderRadius: 6,
		padding: 2,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},
	navButton: {
		padding: 4,
		borderRadius: 4,
	},
	counterText: {
		fontSize: 11,
		fontVariant: ["tabular-nums"],
		minWidth: 32,
		textAlign: "center",
		fontWeight: "500",
	},
});
