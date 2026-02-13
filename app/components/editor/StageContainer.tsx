import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WithGodot } from "@/components/WithGodot";
import { useWorkspaceSnapshot } from "@/lib/editor/hooks/useWorkspaceSnapshot";
import type { GodotBridge } from "@/lib/godot/types";
import { useEditor } from "./EditorProvider";
import { InteractionLayer } from "./InteractionLayer";

const loadGameRuntimeModule = () =>
	import("@/lib/game-engine/GameRuntime.godot") as Promise<
		Record<string, unknown>
	>;

export function StageContainer() {
	const {
		mode,
		timeMode,
		document,
		registerShaderHandler,
		gameId,
		livePreviewEnabled,
	} = useEditor();
	const [runtimeKey, setRuntimeKey] = useState(0);
	const [bridgeApi, setBridgeApi] = useState<GodotBridge | null>(null);

	const { loadState } = useWorkspaceSnapshot(
		gameId,
		bridgeApi,
		livePreviewEnabled,
	);

	const handleRequestRestart = useCallback(() => {
		setRuntimeKey((k) => k + 1);
	}, []);

	const handleBridgeReady = useCallback(
		(api: GodotBridge) => {
			setBridgeApi(api);
			registerShaderHandler((shaderId, source) => {
				api.hotSwapShader(shaderId, source);
			});
		},
		[registerShaderHandler],
	);

	const renderRuntime = useCallback(
		(mod: Record<string, unknown>) => {
			const GameRuntimeGodot = (
				mod as {
					GameRuntimeGodot: React.ComponentType<Record<string, unknown>>;
				}
			).GameRuntimeGodot;
			return (
				<GameRuntimeGodot
					definition={document}
					showHUD={mode === "live"}
					paused={mode === "author" && timeMode === "paused"}
					onRequestRestart={handleRequestRestart}
					onBridgeReady={handleBridgeReady}
				/>
			);
		},
		[document, mode, timeMode, handleRequestRestart, handleBridgeReady],
	);

	if (livePreviewEnabled && loadState === "loading") {
		return (
			<View className="flex-1 bg-gray-800 items-center justify-center">
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text className="text-white mt-4">Loading Live Preview...</Text>
			</View>
		);
	}

	if (!document || !document.world) {
		return (
			<View className="flex-1 bg-gray-800 items-center justify-center">
				<ActivityIndicator size="large" color="#4CAF50" />
			</View>
		);
	}

	const worldBounds = document.world.bounds ?? { width: 20, height: 12 };
	const pixelsPerMeter = document.world.pixelsPerMeter ?? 50;

	return (
		<View className="flex-1 bg-gray-800">
			<WithGodot
				key={runtimeKey}
				loadModule={loadGameRuntimeModule}
				render={renderRuntime}
				fallback={
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color="#4CAF50" />
					</View>
				}
			/>

			{mode === "author" && (
				<View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
					<InteractionLayer
						pixelsPerMeter={pixelsPerMeter}
						worldBounds={worldBounds}
					/>
				</View>
			)}
		</View>
	);
}
