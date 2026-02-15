import { StyleSheet, View } from "react-native";
import { GameRuntimeGodot } from "@/lib/game-engine/GameRuntime.godot";
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
	title: "Font Test Overlay",
	description: "Test custom font rendering in React Native overlays",
};

const FONT_TEST_GAME = {
	metadata: {
		id: "font-test-overlay",
		title: "Font Test Overlay",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: 0 },
		pixelsPerMeter: 50,
		bounds: { width: 16, height: 12 },
	},
	camera: { type: "fixed" as const, zoom: 1 },
	variables: {
		score: 0,
		lives: 3,
	},
	prefabs: {},
	entities: [],
	overlay: {
		theme: {
			fontPreset: "pixel" as const,
			textColor: "#FFFFFF",
			fontSize: 16,
			primaryColor: "#4CAF50",
			backgroundColor: "rgba(0,0,0,0.6)",
		},
		elements: [
			{
				id: "title",
				type: "text" as const,
				anchor: "top-center" as const,
				offset: { x: 0, y: 20 },
				text: "Font Test",
				fontSize: 32,
				fontFamily: "pixel",
			},
			{
				id: "pixel-text",
				type: "text" as const,
				anchor: "top-left" as const,
				offset: { x: 20, y: 80 },
				text: "Pixel Font (PressStart2P)",
				fontFamily: "PressStart2P",
				fontSize: 14,
			},
			{
				id: "retro-text",
				type: "text" as const,
				anchor: "top-left" as const,
				offset: { x: 20, y: 120 },
				text: "Retro Font (Bangers)",
				fontFamily: "Bangers",
				fontSize: 24,
			},
			{
				id: "handwritten-text",
				type: "text" as const,
				anchor: "top-left" as const,
				offset: { x: 20, y: 160 },
				text: "Handwritten Font (Fredoka)",
				fontFamily: "Fredoka",
				fontSize: 20,
			},
			{
				id: "system-text",
				type: "text" as const,
				anchor: "top-left" as const,
				offset: { x: 20, y: 200 },
				text: "System Font (default)",
				fontFamily: "system",
				fontSize: 18,
			},
			{
				id: "score-counter",
				type: "counter" as const,
				anchor: "top-right" as const,
				offset: { x: -20, y: 20 },
				iconEmoji: "⭐",
				fontSize: 24,
				bindings: { value: "score" },
			},
		],
	},
};

export default function FontTestOverlay() {
	return (
		<View style={styles.container}>
			<GameRuntimeGodot definition={FONT_TEST_GAME} debugMode={false} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1a1a2e",
	},
	game: {
		flex: 1,
	},
});
