import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useEditor } from "./EditorProvider";
import { WithGodot } from "@/components/WithGodot";
import { InteractionLayer } from "./InteractionLayer";

export function StageContainer() {
  const { mode, document } = useEditor();
  const [runtimeKey, setRuntimeKey] = useState(0);

  const handleRequestRestart = useCallback(() => {
    setRuntimeKey((k) => k + 1);
  }, []);

  const activePackId = document.assetSystem?.activeAssetPackId;
  const worldBounds = document.world.bounds ?? { width: 20, height: 12 };
  const pixelsPerMeter = document.world.pixelsPerMeter ?? 50;

  console.log('[StageContainer] Render - activePackId:', activePackId, 'runtimeKey:', runtimeKey);

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
