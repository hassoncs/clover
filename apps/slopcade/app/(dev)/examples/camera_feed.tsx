import type { GodotBridge } from "@slopcade/godot-bridge";
import type { GameDefinition } from "@slopcade/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import { CameraCapture, useCameraTexture } from "@/lib/camera";

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "camera-feed",
		title: "Camera Feed",
		description: "Live camera feed on a Godot entity",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: -9.8 },
		pixelsPerMeter: PIXELS_PER_METER,
		bounds: WORLD_BOUNDS,
	},
	camera: { type: "fixed", zoom: 1 },
	prefabs: {
		cameraTarget: {
			id: "cameraTarget",
			tags: ["camera-target"],
			visual: { type: "rect", width: 6, height: 4, color: "#808080" },
			physics: { bodyType: "static" },
			collider: { shape: "box", width: 6, height: 4 },
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
			id: "camera_sprite",
			name: "Camera Feed",
			prefab: "cameraTarget",
			transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
};

export default function CameraFeedExample() {
	const router = useRouter();
	const [bridge, setBridge] = useState<GodotBridge | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [GodotView, setGodotView] = useState<React.ComponentType<{
		style?: object;
	}> | null>(null);
	const [logs, setLogs] = useState<string[]>([]);

	const camera = useCameraTexture(bridge as GodotBridge);

	const addLog = useCallback((message: string) => {
		console.log(`[CameraFeed] ${message}`);
		setLogs((prev) => [
			...prev.slice(-9),
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	}, []);

	useEffect(() => {
		let mounted = true;

		addLog("Loading Godot module...");

		import("@slopcade/godot-bridge")
			.then(async (mod) => {
				if (!mounted) return;

				addLog("Creating bridge...");
				const newBridge = await mod.createGodotBridge();

				if (!mounted) return;
				setBridge(newBridge);
				setGodotView(() => mod.GodotView);
				addLog("GodotView ready, waiting for WASM...");
			})
			.catch((err) => {
				if (!mounted) return;
				setStatus("error");
				setErrorMsg(
					err instanceof Error ? err.message : "Failed to load Godot module",
				);
			});

		return () => {
			mounted = false;
		};
	}, [addLog]);

	useEffect(() => {
		if (!bridge || !GodotView) return;

		let mounted = true;

		addLog("Initializing bridge (waiting for WASM)...");
		bridge
			.initialize()
			.then(() => {
				if (!mounted) return;
				addLog("Bridge initialized!");

				addLog("Loading game definition...");
				return bridge.loadGame(GAME_DEFINITION);
			})
			.then(() => {
				if (!mounted) return;
				addLog("Game loaded successfully!");
				setStatus("ready");
			})
			.catch((err) => {
				if (!mounted) return;
				addLog(`Error: ${err.message}`);
				setStatus("error");
				setErrorMsg(
					err instanceof Error ? err.message : "Failed to initialize",
				);
			});

		return () => {
			mounted = false;
		};
	}, [bridge, GodotView, addLog]);

	const handleStartCamera = useCallback(async () => {
		if (!bridge || status !== "ready") return;

		try {
			addLog("Starting camera feed...");
			await camera.start({
				targetEntityId: "camera_sprite",
				resolution: "480p",
			});
			addLog("Camera started!");
		} catch (err) {
			addLog(
				`Failed to start camera: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}, [bridge, status, camera, addLog]);

	const handleStopCamera = useCallback(async () => {
		if (!bridge || status !== "ready") return;

		try {
			addLog("Stopping camera feed...");
			await camera.stop();
			addLog("Camera stopped!");
		} catch (err) {
			addLog(
				`Failed to stop camera: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}, [bridge, status, camera, addLog]);

	if (status === "error") {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
				<Text className="text-red-400 text-lg mb-4">{errorMsg}</Text>
				<Pressable
					onPress={() => router.back()}
					className="py-2 px-4 bg-gray-700 rounded-lg"
				>
					<Text className="text-white font-semibold">← Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
			<FullScreenHeader
				title="Camera Feed"
				rightContent={
					status === "loading" ? (
						<Text className="text-yellow-400 text-xs">Loading...</Text>
					) : null
				}
			/>

			<View className="flex-1 bg-gray-900">
				<View className="flex-1">
					{GodotView ? (
						<GodotView style={{ flex: 1 }} />
					) : (
						<View className="flex-1 items-center justify-center">
							<Text className="text-white">Loading Godot...</Text>
						</View>
					)}
					<CameraCapture isActive={camera.isActive} />
				</View>

				<View className="bg-black/80 p-3">
					<View className="flex-row justify-center gap-2 mb-3">
						<Pressable
							onPress={handleStartCamera}
							disabled={status !== "ready" || camera.isActive}
							className={`py-2 px-4 rounded-lg ${
								status === "ready" && !camera.isActive
									? "bg-green-600"
									: "bg-gray-600"
							}`}
						>
							<Text className="text-white font-semibold">Start Camera</Text>
						</Pressable>
						<Pressable
							onPress={handleStopCamera}
							disabled={status !== "ready" || !camera.isActive}
							className={`py-2 px-4 rounded-lg ${
								status === "ready" && camera.isActive
									? "bg-red-600"
									: "bg-gray-600"
							}`}
						>
							<Text className="text-white font-semibold">Stop Camera</Text>
						</Pressable>
					</View>

					<View className="items-center mb-2">
						<Text
							className={`text-xs font-bold ${
								camera.isActive ? "text-green-400" : "text-gray-400"
							}`}
						>
							Status: {camera.isActive ? "ACTIVE" : "INACTIVE"}
						</Text>
					</View>

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
			</View>
		</SafeAreaView>
	);
}
