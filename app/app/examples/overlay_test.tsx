import type { GameDefinition } from "@slopcade/shared";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameRuntimeGodot } from "@/lib/game-engine/GameRuntime.godot";
import type { ExampleMeta } from "@/lib/registry/types";
import { FullScreenHeader } from "../../components/FullScreenHeader";

export const metadata: ExampleMeta = {
	title: "Overlay Test",
	description:
		"Test the declarative overlay HUD system with all element types.",
};

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "overlay-test",
		title: "Overlay Test",
		description: "Testing the overlay HUD system",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: -10 },
		pixelsPerMeter: 50,
		bounds: { width: 14, height: 18 },
	},
	camera: { type: "fixed", zoom: 1 },
	variables: {
		score: 0,
		lives: 3,
		health: 75,
		maxHealth: 100,
		coins: 42,
	},
	prefabs: {
		ball: {
			id: "ball",
			tags: ["ball"],
			visual: { type: "circle", radius: 0.5, color: "#4CAF50" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: { shape: "circle", radius: 0.5, restitution: 0.8 },
		},
		ground: {
			id: "ground",
			tags: ["ground"],
			visual: { type: "rect", width: 14, height: 1, color: "#2C3E50" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 14,
				height: 1,
				friction: 0.5,
				restitution: 0.2,
			},
		},
	},
	entities: [
		{
			id: "ground",
			name: "Ground",
			prefab: "ground",
			transform: { x: 0, y: -8.5, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "ball-1",
			name: "Ball 1",
			prefab: "ball",
			transform: { x: 5, y: 12, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "ball-2",
			name: "Ball 2",
			prefab: "ball",
			transform: { x: 7, y: 14, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "ball-3",
			name: "Ball 3",
			prefab: "ball",
			transform: { x: 9, y: 16, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
	overlay: {
		elements: [
			{
				id: "score-display",
				type: "text",
				anchor: "top-center",
				offset: { x: 0, y: 16 },
				fontSize: 28,
				fontWeight: "bold",
				color: "#FFFFFF",
				bindings: { text: "{{variables.score}}" },
			},
			{
				id: "lives-counter",
				type: "counter",
				anchor: "top-left",
				offset: { x: 16, y: 16 },
				iconEmoji: "❤️",
				fontSize: 22,
				color: "#FFFFFF",
				bindings: { value: "variables.lives" },
			},
			{
				id: "coins-counter",
				type: "counter",
				anchor: "top-left",
				offset: { x: 16, y: 52 },
				iconEmoji: "🪙",
				fontSize: 22,
				color: "#FFD700",
				bindings: { value: "variables.coins" },
			},
			{
				id: "health-bar",
				type: "bar",
				anchor: "bottom-left",
				offset: { x: 16, y: 60 },
				width: 150,
				height: 16,
				color: "#FF4444",
				borderRadius: 4,
				showLabel: true,
				labelFormat: "{value}/{max}",
				bindings: { value: "variables.health", max: "variables.maxHealth" },
				style: {
					shadow: true,
				},
			},
			{
				id: "ball-count",
				type: "text",
				anchor: "top-right",
				offset: { x: 16, y: 16 },
				fontSize: 16,
				color: "#AAAAAA",
				bindings: { text: "Balls: {{entityCount('ball')}}" },
				style: {
					backgroundColor: "rgba(0,0,0,0.6)",
					borderRadius: 8,
					paddingHorizontal: 12,
					paddingVertical: 6,
				},
			},
			{
				id: "low-health-warning",
				type: "text",
				anchor: "center",
				offset: { x: 0, y: 0 },
				text: "⚠️ LOW HEALTH!",
				fontSize: 24,
				fontWeight: "bold",
				color: "#FF0000",
				visibleWhen: "variables.health < 30",
				style: {
					backgroundColor: "rgba(255,0,0,0.2)",
					borderRadius: 8,
					padding: 12,
				},
			},
		],
	},
};

export default function OverlayTestExample() {
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
			<FullScreenHeader title="Overlay Test" />
			<View style={{ flex: 1 }}>
				<GameRuntimeGodot definition={GAME_DEFINITION} debugMode={false} />
			</View>
		</SafeAreaView>
	);
}
