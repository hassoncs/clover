import { View, ActivityIndicator } from "react-native";
import { useEditor } from "./EditorProvider";
import { WithSkia } from "@/components/WithSkia";

export function StageContainer() {
  const { mode, document } = useEditor();

  const activePackId = document.activeAssetPackId;

  return (
    <View className="flex-1 bg-gray-800">
      <WithSkia
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.native").then((mod) => ({
            default: () => (
              <mod.GameRuntime
                definition={document}
                showHUD={mode === "playtest"}
                renderMode="default"
                showDebugOverlays={false}
                activeAssetPackId={activePackId}
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
    </View>
  );
}
