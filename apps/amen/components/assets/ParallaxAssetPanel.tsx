import type { ParallaxConfig } from "@slopcade/shared";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	Switch,
	Text,
	View,
} from "react-native";
import { resolveAssetUrl } from "@/lib/config/env";

type ParallaxDepth = "sky" | "far" | "mid" | "near";

interface Props {
	parallaxConfig: ParallaxConfig | undefined;
	onToggleEnabled: (enabled: boolean) => void;
	onGenerateLayer: (depth: ParallaxDepth) => void;
	onGenerateAllLayers: () => void;
	onLayerVisibilityChange: (depth: ParallaxDepth, visible: boolean) => void;
	generatingLayer?: ParallaxDepth | "all";
	selectedStyle: string;
}

const DEPTH_INFO: Record<
	ParallaxDepth,
	{ label: string; parallaxFactor: number; color: string }
> = {
	sky: { label: "Sky (Back)", parallaxFactor: 0.1, color: "#1e3a5f" },
	far: { label: "Far Distance", parallaxFactor: 0.3, color: "#2d4a6f" },
	mid: { label: "Mid Distance", parallaxFactor: 0.6, color: "#3d5a7f" },
	near: { label: "Near (Front)", parallaxFactor: 0.9, color: "#4d6a8f" },
};

export function ParallaxAssetPanel({
	parallaxConfig,
	onToggleEnabled,
	onGenerateLayer,
	onGenerateAllLayers,
	onLayerVisibilityChange,
	generatingLayer,
	selectedStyle,
}: Props) {
	const layers = parallaxConfig?.layers || [];
	const isEnabled = parallaxConfig?.enabled ?? false;
	const isGeneratingAny = !!generatingLayer;

	return (
		<View className="mt-4 p-3 bg-theme-surface-elevated rounded-lg">
			<View className="flex-row justify-between items-center mb-3">
				<Text className="text-theme-text font-bold">Parallax Background</Text>
				<Switch
					value={isEnabled}
					onValueChange={onToggleEnabled}
					trackColor={{ false: "#374151", true: "#C9A84C" }}
					thumbColor={isEnabled ? "#FDF8F0" : "#9ca3af"}
					accessibilityLabel="Enable parallax background"
				/>
			</View>

			{isEnabled && (
				<>
					<Pressable
						className={`py-3 rounded-lg items-center mb-3 ${isGeneratingAny ? "bg-theme-surface" : "bg-theme-primary"}`}
						onPress={onGenerateAllLayers}
						disabled={isGeneratingAny}
						accessibilityRole="button"
						accessibilityLabel={`Generate all parallax layers in ${selectedStyle} style`}
						accessibilityState={{ disabled: isGeneratingAny }}
					>
						{generatingLayer === "all" ? (
							<View className="flex-row items-center">
								<ActivityIndicator color="#FDF8F0" size="small" />
								<Text className="text-theme-text-inverse font-semibold ml-2">
									Generating All...
								</Text>
							</View>
						) : (
							<Text className="text-theme-secondary font-semibold">
								Generate All Layers ({selectedStyle})
							</Text>
						)}
					</Pressable>

					<ScrollView className="max-h-48">
						{(["sky", "far", "mid", "near"] as ParallaxDepth[]).map((depth) => {
							const layer = layers.find((l) => l.depth === depth);
							const info = DEPTH_INFO[depth];
							const isGeneratingThis = generatingLayer === depth;

							return (
								<View
									key={depth}
									className="flex-row items-center p-2 bg-theme-surface rounded-lg mb-2"
								>
									{layer?.imageUrl ? (
										<Image
											source={{ uri: resolveAssetUrl(layer.imageUrl) }}
											className="w-16 h-10 rounded"
											resizeMode="cover"
										/>
									) : (
										<View
											className="w-16 h-10 rounded items-center justify-center"
											style={{ backgroundColor: info.color }}
										>
											<Text className="text-theme-text-inverse text-xs">
												Empty
											</Text>
										</View>
									)}

									<View className="flex-1 ml-3">
										<Text className="text-theme-text font-medium text-sm">
											{info.label}
										</Text>
										<Text className="text-theme-text-secondary text-xs">
											Parallax: {(info.parallaxFactor * 100).toFixed(0)}%
										</Text>
									</View>

									<Pressable
										className={`p-2 rounded mr-2 ${isGeneratingThis || isGeneratingAny ? "bg-theme-surface-elevated" : "bg-theme-primary"}`}
										onPress={() => onGenerateLayer(depth)}
										disabled={isGeneratingAny}
										accessibilityRole="button"
										accessibilityLabel={`Generate ${info.label} layer`}
										accessibilityState={{ disabled: isGeneratingAny }}
									>
										{isGeneratingThis ? (
											<ActivityIndicator color="#FDF8F0" size="small" />
										) : (
											<Text className="text-theme-secondary text-xs">Gen</Text>
										)}
									</Pressable>

									<Switch
										value={layer?.visible ?? false}
										onValueChange={(v) => onLayerVisibilityChange(depth, v)}
										trackColor={{ false: "#374151", true: "#5B7F3B" }}
										thumbColor={layer?.visible ? "#FDF8F0" : "#9ca3af"}
										accessibilityLabel={`Toggle ${info.label} layer visibility`}
									/>
								</View>
							);
						})}
					</ScrollView>

					<Text className="text-theme-text-tertiary text-xs mt-2 text-center">
						Tip: Generate layers from back (Sky) to front (Near) for best
						results
					</Text>
				</>
			)}
		</View>
	);
}
