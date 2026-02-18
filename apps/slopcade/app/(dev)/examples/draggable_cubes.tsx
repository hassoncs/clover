import type { GameDefinition } from "@slopcade/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import { FullScreenHeader } from "@/components/FullScreenHeader";

export const metadata: ExampleMeta = {
	title: "Draggable Cubes",
	description:
		"Drag physics bodies with mouse/touch. Uses the draggable behavior system.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "draggable-cubes",
		title: "Draggable Cubes",
		description: "Drag the cubes around with your mouse or finger",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: -25 },
		pixelsPerMeter: PIXELS_PER_METER,
		bounds: WORLD_BOUNDS,
	},
	camera: { type: "fixed", zoom: 1 },
	prefabs: {
		cube: {
			id: "cube",
			tags: ["draggable"],
			visual: { type: "rect", width: 1.5, height: 1.5, color: "#4ECDC4" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: {
				shape: "box",
				width: 1.5,
				height: 1.5,
				friction: 0.3,
				restitution: 0.2,
			},
		},
		ground: {
			id: "ground",
			visual: { type: "rect", width: 14, height: 1, color: "#2C3E50" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 14,
				height: 1,
				friction: 0.5,
				restitution: 0,
			},
		},
		wall: {
			id: "wall",
			visual: { type: "rect", width: 0.5, height: 18, color: "#2C3E50" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 0.5,
				height: 18,
				friction: 0.5,
				restitution: 0.3,
			},
		},
		anchor: {
			id: "anchor",
			visual: { type: "rect", width: 0.3, height: 0.3, color: "#FF6B6B" },
			physics: { bodyType: "static" },
			collider: { shape: "box", width: 0.3, height: 0.3 },
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
			name: "Left Wall",
			prefab: "wall",
			transform: { x: -6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "wall-right",
			name: "Right Wall",
			prefab: "wall",
			transform: { x: 6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "anchor1",
			name: "Anchor",
			prefab: "anchor",
			transform: { x: 0, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "cube1",
			name: "Cube 1",
			prefab: "cube",
			transform: { x: 0, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "cube2",
			name: "Cube 2",
			prefab: "cube",
			transform: { x: -4, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "cube3",
			name: "Cube 3",
			prefab: "cube",
			transform: { x: 4, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
	joints: [
		{
			id: "spring1",
			type: "distance",
			entityA: "anchor1",
			entityB: "cube1",
			anchorA: { x: 0, y: 7 },
			anchorB: { x: 0, y: 5 },
			length: 2,
			stiffness: 50,
			damping: 5,
		},
	],
};

export default function DraggableCubesExample() {
	const router = useRouter();
	const [GameRuntime, setGameRuntime] = useState<React.ComponentType<{
		definition: GameDefinition;
		showHUD?: boolean;
		autoStart?: boolean;
		onBackToMenu?: () => void;
	}> | null>(null);

	useEffect(() => {
		import("@slopcade/game-runtime/GameRuntime.godot").then((mod) => {
			setGameRuntime(() => mod.GameRuntimeGodotWithDevTools);
		});
	}, []);

	const handleBack = useCallback(() => router.back(), [router]);

	return (
		<View style={{ flex: 1, backgroundColor: "#111827" }}>
			<FullScreenHeader onBack={handleBack} showBackground />

			{GameRuntime ? (
				<GameRuntime
					definition={GAME_DEFINITION}
					showHUD={false}
					autoStart
					onBackToMenu={handleBack}
				/>
			) : (
				<View
					style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
				>
					<Text style={{ color: "#FFFFFF" }}>Loading Godot...</Text>
				</View>
			)}
		</View>
	);
}
