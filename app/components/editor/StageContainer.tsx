import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useEditor } from "./EditorProvider";
import { WithGodot } from "@/components/WithGodot";
import { InteractionLayer } from "./InteractionLayer";

export function StageContainer() {
  const { mode, document, registerShaderHandler } = useEditor();
  const [runtimeKey, setRuntimeKey] = useState(0);

  const handleRequestRestart = useCallback(() => {
    setRuntimeKey((k) => k + 1);
  }, []);

  const handleBridgeReady = useCallback((api: { hotSwapShader: (shaderId: string, source: string) => void }) => {
    registerShaderHandler((shaderId, source) => {
      api.hotSwapShader(shaderId, source);
    });
  }, [registerShaderHandler]);

  if (!document || !document.world) {
    return (
      <View className="flex-1 bg-gray-800 items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const activePackId = document.assetSystem?.activePackId;
  const worldBounds = document.world.bounds ?? { width: 20, height: 12 };
  const pixelsPerMeter = document.world.pixelsPerMeter ?? 50;

  return (
    <View className="flex-1 bg-gray-800">
      <WithGodot
        key={`${runtimeKey}-${activePackId ?? 'none'}`}
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
            default: () => (
              <mod.GameRuntimeGodot
                definition={document}
                showHUD={mode === "playtest"}
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
