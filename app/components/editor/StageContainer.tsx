import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WithGodot } from "@/components/WithGodot";
import { useWorkspaceSnapshot } from "@/lib/editor/hooks/useWorkspaceSnapshot";
import type { GodotBridge } from "@/lib/godot/types";
import { useEditor } from "./EditorProvider";
import { InteractionLayer } from "./InteractionLayer";

interface StageContainerProps {
	onLivePreviewChange?: (enabled: boolean) => void;
}

export function StageContainer({ onLivePreviewChange }: StageContainerProps) {
	const { mode, timeMode, document, registerShaderHandler, gameId } =
		useEditor();
	const [runtimeKey, setRuntimeKey] = useState(0);
	const [bridgeApi, setBridgeApi] = useState<GodotBridge | null>(null);

	const { livePreviewEnabled, loadState } = useWorkspaceSnapshot(
		gameId,
		bridgeApi,
	);

	useEffect(() => {
		onLivePreviewChange?.(livePreviewEnabled);
	}, [livePreviewEnabled, onLivePreviewChange]);

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

	const activeRemixId = document.assetSystem?.activeRemixId;
	const worldBounds = document.world.bounds ?? { width: 20, height: 12 };
	const pixelsPerMeter = document.world.pixelsPerMeter ?? 50;

	return (
		<View className="flex-1 bg-gray-800">
			<WithGodot
				key={`${runtimeKey}-${activeRemixId ?? "none"}`}
				getComponent={() =>
					import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
						default: () => (
							<mod.GameRuntimeGodot
								definition={document}
								showHUD={mode === "playtest"}
								paused={mode === "edit" && timeMode === "paused"}
								onRequestRestart={handleRequestRestart}
								onBridgeReady={handleBridgeReady}
							/>
						),
					}))
				}
				fallback={
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color="#4CAF50" />
					</View>
				}
			/>

			{mode === "edit" && (
				<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
					<InteractionLayer
						pixelsPerMeter={pixelsPerMeter}
						worldBounds={worldBounds}
					/>
				</View>
			)}
		</View>
	);
}
