import {
	Canvas,
	Fill,
	Shader,
	Skia,
	useClock,
} from "@shopify/react-native-skia";
import {
	getShaderSkSL,
	getSkSLCompatibleShaderKeys,
	SHADER_REGISTRY,
} from "@slopcade/shared/effects";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenHeader } from "@/components/FullScreenHeader";

export default function SkiaShaderExample() {
	const compatibleShaders = useMemo(() => getSkSLCompatibleShaderKeys(), []);
	const [selectedShaderId, setSelectedShaderId] = useState<string>(
		compatibleShaders.includes("rbPlasma")
			? "rbPlasma"
			: (compatibleShaders[0] ?? ""),
	);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

	const skslResult = useMemo(() => {
		if (!selectedShaderId) return null;
		return getShaderSkSL(selectedShaderId);
	}, [selectedShaderId]);

	const { runtimeEffect, error } = useMemo(() => {
		if (!skslResult?.sksl)
			return { runtimeEffect: null, error: "No SkSL source" };
		try {
			const effect = Skia.RuntimeEffect.Make(skslResult.sksl);
			if (!effect) {
				return {
					runtimeEffect: null,
					error: "Compilation failed (returned null)",
				};
			}
			return { runtimeEffect: effect, error: null };
		} catch (err) {
			return {
				runtimeEffect: null,
				error: err instanceof Error ? err.message : "Compilation failed",
			};
		}
	}, [skslResult]);

	const clock = useClock();

	const uniforms = useDerivedValue(() => {
		const result: Record<string, number | number[]> = {};
		if (skslResult?.uniforms) {
			for (const u of skslResult.uniforms) {
				if (u.name === "iTime") {
					result.iTime = clock.value / 1000;
				} else if (u.name === "iResolution") {
					result.iResolution = [canvasSize.width, canvasSize.height];
				} else if (u.defaultValue !== undefined) {
					if (Array.isArray(u.defaultValue)) {
						result[u.name] = u.defaultValue;
					} else {
						result[u.name] = u.defaultValue;
					}
				} else {
					if (u.type === "float") result[u.name] = 0;
					else if (u.type === "float2") result[u.name] = [0, 0];
					else if (u.type === "float3") result[u.name] = [0, 0, 0];
					else if (u.type === "float4") result[u.name] = [0, 0, 0, 0];
					else if (u.type === "int") result[u.name] = 0;
					else if (u.type === "int2") result[u.name] = [0, 0];
					else if (u.type === "int3") result[u.name] = [0, 0, 0];
					else if (u.type === "int4") result[u.name] = [0, 0, 0, 0];
				}
			}
		}
		return result;
	}, [skslResult, canvasSize]);

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
			<FullScreenHeader title="Skia Shaders" />

			<View className="bg-black/80 p-2">
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{compatibleShaders.map((id: string) => {
						const entry = SHADER_REGISTRY[id];
						const displayName = entry?.aiHints?.description || id;
						const isSelected = selectedShaderId === id;
						return (
							<Pressable
								key={id}
								onPress={() => setSelectedShaderId(id)}
								className={`px-3 py-2 mr-2 rounded-full border ${
									isSelected
										? "bg-cyan-600 border-cyan-400"
										: "bg-gray-800 border-gray-700"
								}`}
							>
								<Text
									className={`text-xs font-semibold ${
										isSelected ? "text-white" : "text-gray-400"
									}`}
								>
									{id}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
			</View>

			<View
				className="flex-1 items-center justify-center"
				onLayout={(e) => {
					setCanvasSize({
						width: e.nativeEvent.layout.width,
						height: e.nativeEvent.layout.height,
					});
				}}
			>
				{error ? (
					<View className="p-6 items-center">
						<Text className="text-red-400 text-lg font-bold mb-2">
							{selectedShaderId} Compilation Failed
						</Text>
						<Text className="text-red-300 text-sm text-center">{error}</Text>
					</View>
				) : runtimeEffect && canvasSize.width > 0 && canvasSize.height > 0 ? (
					<Canvas
						style={{ width: canvasSize.width, height: canvasSize.height }}
					>
						<Fill>
							<Shader source={runtimeEffect} uniforms={uniforms} />
						</Fill>
					</Canvas>
				) : null}
			</View>
		</SafeAreaView>
	);
}
