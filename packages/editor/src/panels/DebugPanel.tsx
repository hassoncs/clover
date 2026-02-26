import { useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from "react-native";
import { useTheme } from "@slopcade/theme";
import { useInspector } from "../inspector/InspectorProvider";

const isWeb = Platform.OS === "web";

export function DebugPanel() {
	const { editorColors: c } = useTheme();
	const { inspectMode, toggleInspectMode } = useInspector();
	const [showPhysics, setShowPhysics] = useState(false);
	const [showSprites, setShowSprites] = useState(false);
	const [showIds, setShowIds] = useState(false);
	const [pauseOnStart, setPauseOnStart] = useState(false);

	const trackColors = { false: c.surfaceActive, true: c.accent };

	return (
		<View style={[styles.container, { backgroundColor: c.panelBg }]}>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.title, { color: c.text }]}>Debug</Text>
				</View>
			)}

			<ScrollView style={styles.content}>
				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Visualization
					</Text>

					<View style={styles.row}>
						<Text style={{ color: c.text, fontSize: 13 }}>
							Show Physics Shapes
						</Text>
						<Switch
							value={showPhysics}
							onValueChange={setShowPhysics}
							trackColor={trackColors}
							accessibilityLabel="Show physics shapes"
						/>
					</View>

					<View style={styles.row}>
						<Text style={{ color: c.text, fontSize: 13 }}>
							Show Sprite Bounds
						</Text>
						<Switch
							value={showSprites}
							onValueChange={setShowSprites}
							trackColor={trackColors}
							accessibilityLabel="Show sprite bounds"
						/>
					</View>

					<View style={styles.row}>
						<Text style={{ color: c.text, fontSize: 13 }}>Show Entity IDs</Text>
						<Switch
							value={showIds}
							onValueChange={setShowIds}
							trackColor={trackColors}
							accessibilityLabel="Show entity IDs"
						/>
					</View>
				</View>

				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Inspector
					</Text>

					<View style={styles.row}>
						<Text style={{ color: c.text, fontSize: 13 }}>Inspect Mode</Text>
						<Switch
							value={inspectMode}
							onValueChange={toggleInspectMode}
							trackColor={trackColors}
							accessibilityLabel="Inspect mode"
						/>
					</View>

					<View style={styles.row}>
						<Text style={{ color: c.text, fontSize: 13 }}>Pause on Start</Text>
						<Switch
							value={pauseOnStart}
							onValueChange={setPauseOnStart}
							trackColor={trackColors}
							accessibilityLabel="Pause on start"
						/>
					</View>
				</View>

				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Tools
					</Text>
					<Text
						style={{ color: c.textMuted, fontSize: 12, fontStyle: "italic" }}
					>
						Right-click viewport to inspect entities at cursor
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 12,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	section: {
		padding: 12,
		borderBottomWidth: 1,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "600",
		marginBottom: 12,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 6,
	},
});
