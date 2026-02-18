import type { GodotBridge } from "@slopcade/godot-bridge";
import type { GameDefinition } from "@slopcade/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FullScreenHeader } from "@/components/FullScreenHeader";

const DUCK_URL =
	"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb";

const MINIMAL_GAME: GameDefinition = {
	metadata: {
		id: "glb-viewer",
		title: "3D GLB Viewer",
		description: "Minimal scene for 3D model viewing",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: 0 },
		pixelsPerMeter: 50,
		bounds: { width: 14, height: 18 },
	},
	camera: { type: "fixed", zoom: 1 },
	prefabs: {},
	entities: [],
};

export default function GLBViewerExample() {
	const router = useRouter();
	const [bridge, setBridge] = useState<GodotBridge | null>(null);
	const [GodotView, setGodotView] = useState<React.ComponentType<{
		style?: object;
	}> | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [modelLoaded, setModelLoaded] = useState(false);
	const [sceneReady, setSceneReady] = useState(false);
	const [spinning, setSpinning] = useState(true);
	const spinRef = useRef(true);
	const rotationRef = useRef(0);
	const animFrameRef = useRef<number | null>(null);

	useEffect(() => {
		let mounted = true;

		import("@slopcade/godot-bridge")
			.then(async (mod) => {
				if (!mounted) return;
				const newBridge = await mod.createGodotBridge();
				if (!mounted) return;
				setBridge(newBridge);
				setGodotView(() => mod.GodotView);
			})
			.catch((err) => {
				if (!mounted) return;
				console.error("[GLBViewer] Failed to load module:", err);
				setStatus("error");
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!bridge || !GodotView) return;

		let mounted = true;

		bridge
			.initialize()
			.then(() => {
				if (!mounted) return;
				return bridge.loadGame(MINIMAL_GAME);
			})
			.then(() => {
				if (!mounted) return;
				setStatus("ready");
			})
			.catch((err) => {
				if (!mounted) return;
				console.error("[GLBViewer] Failed to initialize:", err);
				setStatus("error");
			});

		return () => {
			mounted = false;
		};
	}, [bridge, GodotView]);

	const jumpAnimRef = useRef<number | null>(null);
	const jumpStartTimeRef = useRef<number>(0);
	const isJumpingRef = useRef(false);
	const baseYRef = useRef(0);

	useEffect(() => {
		if (status !== "ready" || !bridge || sceneReady) return;

		console.log("[GLBViewer] Setting up 3D scene...");

		// Setup viewport
		bridge.set3DViewportPosition(0, 0);
		bridge.set3DViewportSize(720, 720);

		// Create floor - gray infinite grid
		console.log("[GLBViewer] Creating floor...");
		bridge.create3DFloor(100, "6B7280", "grid");

		// Load the duck
		console.log("[GLBViewer] Loading 3D duck model...");
		bridge.show3DModelFromUrl(DUCK_URL);

		baseYRef.current = 0.8;
		bridge.set3DModelPosition(0, baseYRef.current, 0);
		bridge.set3DCameraPosition(3, 5, 5);
		bridge.set3DCameraLookAt(0, 0.5, 0);
		// Increase camera size so we see more of the scene
		bridge.set3DCameraSize(8);

		bridge.setOrbitControls(true);

		setModelLoaded(true);
		setSceneReady(true);
	}, [status, bridge, sceneReady]);

	useEffect(() => {
		spinRef.current = spinning;
	}, [spinning]);

	useEffect(() => {
		if (!bridge || !modelLoaded) return;

		let lastTime = performance.now();

		const tick = (now: number) => {
			const dt = (now - lastTime) / 1000;
			lastTime = now;

			if (spinRef.current) {
				rotationRef.current += dt * 45;
			}
			bridge.rotate3DModel(0, rotationRef.current, 0);
			animFrameRef.current = requestAnimationFrame(tick);
		};

		animFrameRef.current = requestAnimationFrame(tick);
		return () => {
			if (animFrameRef.current !== null) {
				cancelAnimationFrame(animFrameRef.current);
			}
			if (jumpAnimRef.current !== null) {
				cancelAnimationFrame(jumpAnimRef.current);
			}
		};
	}, [bridge, modelLoaded]);

	const handleBack = useCallback(() => router.back(), [router]);

	const handleJump = useCallback(() => {
		if (!bridge || !modelLoaded || isJumpingRef.current) return;

		isJumpingRef.current = true;
		jumpStartTimeRef.current = performance.now();

		const jumpDuration = 600;
		const jumpHeight = 1.5;

		const animateJump = (now: number) => {
			const elapsed = now - jumpStartTimeRef.current;
			const progress = elapsed / jumpDuration;

			if (progress >= 1) {
				bridge.set3DModelPosition(0, baseYRef.current, 0);
				isJumpingRef.current = false;
				return;
			}

			const height = Math.sin(progress * Math.PI) * jumpHeight;
			bridge.set3DModelPosition(0, baseYRef.current + height, 0);
			jumpAnimRef.current = requestAnimationFrame(animateJump);
		};

		jumpAnimRef.current = requestAnimationFrame(animateJump);
	}, [bridge, modelLoaded]);

	return (
		<View style={{ flex: 1, backgroundColor: "#111827" }}>
			<FullScreenHeader title="3D GLB Viewer" showBackground />

			<View style={{ flex: 1 }}>
				{status === "error" ? (
					<View
						style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
					>
						<Text style={{ color: "#F87171", fontSize: 18 }}>
							Failed to load Godot
						</Text>
						<Pressable
							onPress={handleBack}
							style={{
								marginTop: 16,
								paddingVertical: 8,
								paddingHorizontal: 16,
								backgroundColor: "#374151",
								borderRadius: 8,
							}}
						>
							<Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
								Go Back
							</Text>
						</Pressable>
					</View>
				) : GodotView ? (
					<Pressable style={{ flex: 1 }} onPress={handleJump}>
						<GodotView style={{ flex: 1 }} />
					</Pressable>
				) : (
					<View
						style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
					>
						<Text style={{ color: "#FFFFFF" }}>Loading Godot...</Text>
					</View>
				)}
			</View>

			{status === "ready" && (
				<View
					style={{
						backgroundColor: "rgba(0,0,0,0.85)",
						padding: 12,
						flexDirection: "row",
						gap: 8,
					}}
				>
					<Pressable
						onPress={() => setSpinning((s) => !s)}
						style={{
							flex: 1,
							backgroundColor: spinning ? "#DC2626" : "#16A34A",
							borderRadius: 8,
							paddingVertical: 12,
							paddingHorizontal: 16,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								textAlign: "center",
								fontWeight: "600",
							}}
						>
							{spinning ? "Stop Spin" : "Start Spin"}
						</Text>
					</Pressable>
					<Pressable
						onPress={() => bridge?.set3DCameraSize(2)}
						style={{
							flex: 1,
							backgroundColor: "#7C3AED",
							borderRadius: 8,
							paddingVertical: 12,
							paddingHorizontal: 16,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								textAlign: "center",
								fontWeight: "600",
							}}
						>
							Zoom In
						</Text>
					</Pressable>
					<Pressable
						onPress={() => bridge?.set3DCameraSize(8)}
						style={{
							flex: 1,
							backgroundColor: "#7C3AED",
							borderRadius: 8,
							paddingVertical: 12,
							paddingHorizontal: 16,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								textAlign: "center",
								fontWeight: "600",
							}}
						>
							Zoom Out
						</Text>
					</Pressable>
					<Pressable
						onPress={handleJump}
						style={{
							flex: 1,
							backgroundColor: "#3B82F6",
							borderRadius: 8,
							paddingVertical: 12,
							paddingHorizontal: 16,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								textAlign: "center",
								fontWeight: "600",
							}}
						>
							Jump
						</Text>
					</Pressable>
					<Pressable
						onPress={() => {
							if (!bridge) return;
							bridge.clear3DModels();
							setSceneReady(false);
							setModelLoaded(false);
						}}
						style={{
							flex: 1,
							backgroundColor: "#F59E0B",
							borderRadius: 8,
							paddingVertical: 12,
							paddingHorizontal: 16,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								textAlign: "center",
								fontWeight: "600",
							}}
						>
							Reset
						</Text>
					</Pressable>
				</View>
			)}
		</View>
	);
}
