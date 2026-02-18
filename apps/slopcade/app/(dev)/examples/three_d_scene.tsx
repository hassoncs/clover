import Slider from "@react-native-community/slider";
import type { GodotBridge } from "@slopcade/godot-bridge/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenHeader } from "@/components/FullScreenHeader";

const DUCK_GLB_URL =
	"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb";

type Status = "loading" | "ready" | "error";

export default function ThreeDSceneExample() {
	const router = useRouter();
	const [bridge, setBridge] = useState<GodotBridge | null>(null);
	const [GodotView, setGodotView] = useState<React.ComponentType<{
		style?: object;
	}> | null>(null);
	const [status, setStatus] = useState<Status>("loading");

	const [rotX, setRotX] = useState(0);
	const [rotY, setRotY] = useState(0);
	const [rotZ, setRotZ] = useState(0);

	const rotationLabel = useMemo(
		() => `X ${rotX.toFixed(0)}°  Y ${rotY.toFixed(0)}°  Z ${rotZ.toFixed(0)}°`,
		[rotX, rotY, rotZ],
	);

	useEffect(() => {
		let mounted = true;

		import("@slopcade/godot-bridge")
			.then(async (mod) => {
				if (!mounted) return;
				const newBridge = await mod.createGodotBridge();
				setBridge(newBridge);
				setGodotView(() => mod.GodotView);
			})
			.catch((err) => {
				if (!mounted) return;
				console.error("[ThreeDScene] Failed to load module:", err);
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
				setStatus("ready");
			})
			.catch((err) => {
				if (!mounted) return;
				console.error("[ThreeDScene] Failed to initialize:", err);
				setStatus("error");
			});

		return () => {
			mounted = false;
		};
	}, [bridge, GodotView]);

	useEffect(() => {
		if (status !== "ready" || !bridge) return;
		bridge.show3DModelFromUrl(DUCK_GLB_URL);
		bridge.set3DCameraDistance(5);
		bridge.rotate3DModel(0, 0, 0);

		return () => {
			bridge.clear3DModels();
		};
	}, [status, bridge]);

	useEffect(() => {
		if (status !== "ready" || !bridge) return;
		bridge.rotate3DModel(rotX, rotY, rotZ);
	}, [status, bridge, rotX, rotY, rotZ]);

	const onReset = useCallback(() => {
		setRotX(0);
		setRotY(0);
		setRotZ(0);
	}, []);

	const onGodotLayout = useCallback(
		(e: any) => {
			if (!bridge) return;
			const { width, height } = e.nativeEvent.layout;
			bridge.set3DViewportSize(
				Math.max(1, Math.round(width)),
				Math.max(1, Math.round(height)),
			);
		},
		[bridge],
	);

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
			<FullScreenHeader
				title="3D Scene"
				rightContent={
					status === "loading" ? (
						<Text className="text-yellow-400 text-xs">Loading...</Text>
					) : null
				}
			/>

			<View className="flex-1" onLayout={onGodotLayout}>
				{status === "error" ? (
					<View className="flex-1 items-center justify-center p-6">
						<Text className="text-red-400 text-lg">Failed to load Godot</Text>
						<Pressable
							className="mt-6 py-3 px-6 bg-gray-700 rounded-lg"
							onPress={() => router.back()}
						>
							<Text className="text-white font-semibold">← Go Back</Text>
						</Pressable>
					</View>
				) : GodotView ? (
					<GodotView style={{ flex: 1 }} />
				) : (
					<View className="flex-1 items-center justify-center">
						<Text className="text-white">Loading Godot...</Text>
					</View>
				)}
			</View>

			{status === "ready" && (
				<View className="bg-black/80 p-3">
					<View className="flex-row items-center justify-between mb-2">
						<Text className="text-white text-xs">{rotationLabel}</Text>
						<Pressable
							onPress={onReset}
							className="bg-gray-700 rounded-md px-3 py-2"
						>
							<Text className="text-white text-xs font-semibold">Reset</Text>
						</Pressable>
					</View>

					<View className="gap-2">
						<View>
							<Text className="text-white text-xs mb-1">Rotate X</Text>
							<Slider
								minimumValue={-180}
								maximumValue={180}
								value={rotX}
								onValueChange={setRotX}
							/>
						</View>
						<View>
							<Text className="text-white text-xs mb-1">Rotate Y</Text>
							<Slider
								minimumValue={-180}
								maximumValue={180}
								value={rotY}
								onValueChange={setRotY}
							/>
						</View>
						<View>
							<Text className="text-white text-xs mb-1">Rotate Z</Text>
							<Slider
								minimumValue={-180}
								maximumValue={180}
								value={rotZ}
								onValueChange={setRotZ}
							/>
						</View>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
}
