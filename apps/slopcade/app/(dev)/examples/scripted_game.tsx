import { GameRuntimeGodot } from "@slopcade/game-runtime/GameRuntime.godot";
import type { GameDefinition } from "@slopcade/shared";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
	title: "Scripted Game",
	description:
		"Test game with JavaScript scripting sandbox. Tap to spawn balls!",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const DEFAULT_SCRIPT = `// Tap-to-spawn game script
// Available: ctx.spawnEntity(), ctx.destroyEntity(), ctx.getVariable(), ctx.setVariable()

exports.onStart = function(ctx) {
  ctx.setVariable('ballCount', 0);
  ctx.setVariable('maxBalls', 10);
};

exports.onInput = function(ctx, event) {
  if (event.type === 'tap' && event.position) {
    var ballCount = ctx.getVariable('ballCount') || 0;
    var maxBalls = ctx.getVariable('maxBalls') || 10;
    
    if (ballCount < maxBalls) {
      var ball = ctx.spawnEntity('ball', event.position);
      if (ball) {
        ctx.setVariable('ballCount', ballCount + 1);
      }
    }
  }
};

exports.onCollision = function(ctx, collision) {
  // Destroy balls that hit the floor
  var floorId = 'ground';
  if (collision.entityA === floorId || collision.entityB === floorId) {
    var ballId = collision.entityA === floorId ? collision.entityB : collision.entityA;
    if (ballId && ballId.indexOf('ball') === 0) {
      ctx.destroyEntity(ballId);
      var count = ctx.getVariable('ballCount') || 0;
      ctx.setVariable('ballCount', Math.max(0, count - 1));
    }
  }
};
`;

const createGameDefinition = (script: string): GameDefinition => ({
	metadata: {
		id: "scripted-game",
		title: "Scripted Game",
		description: "Test game with JavaScript scripting",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: -15 },
		pixelsPerMeter: PIXELS_PER_METER,
		bounds: WORLD_BOUNDS,
	},
	camera: { type: "fixed", zoom: 1 },
	variables: {
		ballCount: 0,
		maxBalls: 10,
	},
	prefabs: {
		ball: {
			id: "ball",
			tags: ["ball", "spawnable"],
			visual: { type: "circle", radius: 0.4, color: "#FF6B6B" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: {
				shape: "circle",
				radius: 0.4,
				friction: 0.3,
				restitution: 0.6,
			},
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
		platform: {
			id: "platform",
			tags: ["platform"],
			visual: { type: "rect", width: 4, height: 0.3, color: "#4ECDC4" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 4,
				height: 0.3,
				friction: 0.5,
				restitution: 0.3,
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
			id: "platform-1",
			name: "Platform 1",
			prefab: "platform",
			transform: { x: -3, y: -4, angle: -0.2, scaleX: 1, scaleY: 1 },
		},
		{
			id: "platform-2",
			name: "Platform 2",
			prefab: "platform",
			transform: { x: 3, y: -2, angle: 0.2, scaleX: 1, scaleY: 1 },
		},
		{
			id: "platform-3",
			name: "Platform 3",
			prefab: "platform",
			transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
});

export default function ScriptedGameExample() {
	const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT);
	const [editingScript, setEditingScript] = useState(DEFAULT_SCRIPT);
	const [showEditor, setShowEditor] = useState(false);
	const [gameKey, setGameKey] = useState(0);
	const [score, setScore] = useState(0);
	const [isReady, setIsReady] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = useCallback((message: string) => {
		console.log(`[ScriptedGame] ${message}`);
		setLogs((prev) => [
			...prev.slice(-4),
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	}, []);

	const handleReload = useCallback(() => {
		setScriptCode(editingScript);
		setGameKey((k) => k + 1);
		setShowEditor(false);
		addLog("Script reloaded - game restarted");
	}, [editingScript, addLog]);

	const handleReset = useCallback(() => {
		setEditingScript(DEFAULT_SCRIPT);
		setScriptCode(DEFAULT_SCRIPT);
		setGameKey((k) => k + 1);
		addLog("Script reset to default");
	}, [addLog]);

	const handleReady = useCallback(() => {
		setIsReady(true);
		addLog("Game ready");
	}, [addLog]);

	const gameDefinition = createGameDefinition(scriptCode);

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
			<FullScreenHeader
				title="Scripted Game"
				rightContent={
					<View className="flex-row gap-2">
						<Pressable
							onPress={() => setShowEditor(!showEditor)}
							className="py-1 px-3 bg-blue-600 rounded"
						>
							<Text className="text-white text-xs font-semibold">
								{showEditor ? "Hide Script" : "Edit Script"}
							</Text>
						</Pressable>
					</View>
				}
			/>

			{showEditor ? (
				<View className="flex-1 p-2 bg-gray-800">
					<TextInput
						value={editingScript}
						onChangeText={setEditingScript}
						multiline
						className="flex-1 bg-gray-900 text-green-400 font-mono text-xs p-2 rounded"
						style={{ textAlignVertical: "top" }}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<View className="flex-row gap-2 mt-2">
						<Pressable
							onPress={handleReload}
							className="flex-1 py-2 bg-green-600 rounded items-center"
						>
							<Text className="text-white font-semibold">Apply & Restart</Text>
						</Pressable>
						<Pressable
							onPress={handleReset}
							className="py-2 px-4 bg-gray-600 rounded"
						>
							<Text className="text-white font-semibold">Reset</Text>
						</Pressable>
						<Pressable
							onPress={() => setShowEditor(false)}
							className="py-2 px-4 bg-gray-700 rounded"
						>
							<Text className="text-white font-semibold">Cancel</Text>
						</Pressable>
					</View>
				</View>
			) : (
				<>
					<View className="flex-1 bg-gray-900">
						<GameRuntimeGodot
							key={gameKey}
							definition={gameDefinition}
							onScoreChange={setScore}
							onReady={handleReady}
							showHUD={false}
						/>
					</View>

					<View className="bg-black/80 p-3">
						<Text className="text-green-400 font-mono text-xs mb-2">
							{isReady ? "Tap anywhere to spawn balls!" : "Loading..."}
						</Text>
						<Text className="text-yellow-400 font-mono text-xs mb-2">
							Score: {score} | Max Balls:{" "}
							{String(gameDefinition.variables?.maxBalls ?? 10)}
						</Text>
						<View className="border-t border-gray-700 pt-2">
							{logs.map((log, idx) => (
								<Text
									key={`log-${idx}-${log.slice(0, 10)}`}
									className="text-gray-400 font-mono text-xs"
								>
									{log}
								</Text>
							))}
						</View>
					</View>
				</>
			)}
		</SafeAreaView>
	);
}
