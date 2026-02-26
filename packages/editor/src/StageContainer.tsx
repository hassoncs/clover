import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WithGodot } from "@slopcade/ui";
import { useWorkspaceSnapshot } from "./hooks/useWorkspaceSnapshot";
import type { GodotBridge } from "@slopcade/godot-bridge/types";
import { useEditor } from "./EditorProvider";
import { InteractionLayer } from "./InteractionLayer";

const loadGameRuntimeModule = () =>
	import("@slopcade/game-runtime/GameRuntime.godot") as Promise<
		Record<string, unknown>
	>;

export interface StageContainerProps {
	contextId?: string;
}

export function StageContainer({ contextId }: StageContainerProps) {
	const {
		mode,
		timeMode,
		document,
		registerShaderHandler,
		gameId,
		livePreviewEnabled,
		previewContexts,
		runtimeRef,
	} = useEditor();

	const context = contextId
		? previewContexts.find((c) => c.id === contextId)
		: undefined;

	const effectiveMode =
		context?.runtimeIntent === "live"
			? "live"
			: context?.runtimeIntent === "author"
				? "author"
				: mode;

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
					showHUD={effectiveMode === "live"}
					paused={effectiveMode === "author" && timeMode === "paused"}
					onRequestRestart={handleRequestRestart}
					onBridgeReady={handleBridgeReady}
					runtimeRef={runtimeRef}
				/>
			);
		},
		[
			document,
			effectiveMode,
			timeMode,
			handleRequestRestart,
			handleBridgeReady,
			runtimeRef,
		],
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
