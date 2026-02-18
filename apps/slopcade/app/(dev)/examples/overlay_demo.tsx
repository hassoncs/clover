import type { GameDefinition } from "@slopcade/shared";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameRuntimeGodot } from "@/lib/game-engine/GameRuntime.godot";
import type { ExampleMeta } from "@/lib/registry/types";
import { FullScreenHeader } from "@/components/FullScreenHeader";

export const metadata: ExampleMeta = {
	title: "Overlay Demo",
	description:
		"Interactive mini-game showcasing the overlay HUD system with all element types.",
};

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "overlay-demo",
		title: "Tap Blaster",
		description: "Tap to score! Don't let your health run out.",
		instructions: "Tap anywhere to score points. Reach 100 to win!",
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
		health: 100,
		maxHealth: 100,
		combo: 0,
	},
	prefabs: {
		ball: {
			id: "ball",
			tags: ["ball"],
			visual: { type: "circle", radius: 0.4, color: "#E91E63" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: { shape: "circle", radius: 0.4, restitution: 0.6 },
		},
		ground: {
			id: "ground",
			tags: ["ground"],
			visual: { type: "rect", width: 14, height: 1, color: "#1a1a2e" },
			physics: { bodyType: "static" },
			collider: { shape: "box", width: 14, height: 1, friction: 0.5 },
		},
		wallLeft: {
			id: "wallLeft",
			tags: ["wall"],
			visual: { type: "rect", width: 0.5, height: 18, color: "#1a1a2e" },
			physics: { bodyType: "static" },
			collider: { shape: "box", width: 0.5, height: 18 },
		},
		wallRight: {
			id: "wallRight",
			tags: ["wall"],
			visual: { type: "rect", width: 0.5, height: 18, color: "#1a1a2e" },
			physics: { bodyType: "static" },
			collider: { shape: "box", width: 0.5, height: 18 },
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
			id: "wall-left",
			name: "Wall Left",
			prefab: "wallLeft",
			transform: { x: -7.25, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "wall-right",
			name: "Wall Right",
			prefab: "wallRight",
			transform: { x: 7.25, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
	overlay: {
		theme: {
			primaryColor: "#E91E63",
			textColor: "#FFFFFF",
		},
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
				style: {
					backgroundColor: "rgba(0,0,0,0.5)",
					borderRadius: 12,
					paddingHorizontal: 20,
					paddingVertical: 8,
				},
			},
			{
				id: "timer",
				type: "text",
				anchor: "top-center",
				offset: { x: 0, y: 68 },
				fontSize: 14,
				color: "#AAAAAA",
				bindings: { text: "{{formatTime(elapsed)}}" },
			},
			{
				id: "lives-counter",
				type: "counter",
				anchor: "top-left",
				offset: { x: 16, y: 16 },
				iconEmoji: "\u2764\uFE0F",
				fontSize: 22,
				color: "#FFFFFF",
				bindings: { value: "variables.lives" },
			},
			{
				id: "ball-count",
				type: "text",
				anchor: "top-right",
				offset: { x: 16, y: 16 },
				fontSize: 16,
				color: "#AAAAAA",
				bindings: { text: "BALLS\n{{entityCount('ball')}}" },
				style: {
					backgroundColor: "rgba(0,0,0,0.6)",
					borderRadius: 8,
					paddingHorizontal: 12,
					paddingVertical: 6,
				},
			},
			{
				id: "health-bar",
				type: "bar",
				anchor: "bottom-left",
				offset: { x: 16, y: 60 },
				width: 160,
				height: 18,
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
				id: "combo-info",
				type: "container",
				anchor: "bottom-center",
				offset: { x: 0, y: 60 },
				direction: "vertical",
				gap: 4,
				visibleWhen: "variables.combo > 0",
				style: {
					backgroundColor: "rgba(233,30,99,0.3)",
					borderRadius: 8,
					paddingHorizontal: 12,
					paddingVertical: 6,
				},
				children: [
					{
						id: "combo-label",
						type: "text",
						fontSize: 12,
						color: "#FFD700",
						fontWeight: "bold",
						bindings: { text: "COMBO x{{variables.combo}}" },
					},
					{
						id: "combo-bonus",
						type: "text",
						fontSize: 10,
						color: "#AAAAAA",
						bindings: { text: "Keep tapping!" },
					},
				],
			},
			{
				id: "low-health-warning",
				type: "text",
				anchor: "center",
				offset: { x: 0, y: 0 },
				text: "\u26A0\uFE0F LOW HEALTH!",
				fontSize: 24,
				fontWeight: "bold",
				color: "#FF0000",
				visibleWhen: "variables.health < 25",
				style: {
					backgroundColor: "rgba(255,0,0,0.2)",
					borderRadius: 8,
					padding: 12,
				},
			},
			{
				id: "heal-button",
				type: "button",
				anchor: "bottom-right",
				offset: { x: 16, y: 60 },
				label: "\uD83D\uDC8A Heal",
				eventName: "heal",
				color: "#4CAF50",
				textColor: "#FFFFFF",
				fontSize: 16,
				visibleWhen: "variables.score >= 30 && variables.health < 80",
				style: {
					borderRadius: 10,
					paddingHorizontal: 16,
					paddingVertical: 10,
				},
			},
		],
	},
};

export default function OverlayDemoExample() {
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f1a" }}>
			<FullScreenHeader title="Overlay Demo" />
			<View style={{ flex: 1 }}>
				<GameRuntimeGodot definition={GAME_DEFINITION} debugMode={false} />
			</View>
		</SafeAreaView>
	);
}
