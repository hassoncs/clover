import type { EffectGraphSpec, ParamValue } from "@slopcade/shared/effects";
import {
	type DeviceTier,
	detectDeviceTier,
	getMobileEffectLimits,
	TEXT_EFFECT_PRESETS,
} from "@slopcade/shared/effects/text";
import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { EffectTuningPanel } from "./EffectTuningPanel";

interface TextEffectEditorProps {
	initialText?: string;
	onApply: (spec: EffectGraphSpec) => void;
	onPreview?: (spec: EffectGraphSpec) => void;
}

interface GeneratedEffect {
	spec: EffectGraphSpec;
	tier: DeviceTier;
}

export function TextEffectEditor({
	initialText = "Hello World",
	onApply,
	onPreview,
}: TextEffectEditorProps) {
	const [text, setText] = useState(initialText);
	const [description, setDescription] = useState("");
	const [selectedTier, setSelectedTier] = useState<DeviceTier>(
		detectDeviceTier(),
	);
	const [generatedEffect, setGeneratedEffect] =
		useState<GeneratedEffect | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	const limits = useMemo(
		() => getMobileEffectLimits(selectedTier),
		[selectedTier],
	);

	const handleGenerate = useCallback(async () => {
		if (!description.trim()) return;

		setIsGenerating(true);
		try {
			const spec = await generateTextEffect(description, text, selectedTier);
			setGeneratedEffect({ spec, tier: selectedTier });
			onPreview?.(spec);
		} catch (error) {
			console.error("Failed to generate text effect:", error);
		} finally {
			setIsGenerating(false);
		}
	}, [description, text, selectedTier, onPreview]);

	const handlePresetSelect = useCallback(
		async (presetKey: keyof typeof TEXT_EFFECT_PRESETS) => {
			const preset = TEXT_EFFECT_PRESETS[presetKey];
			setIsGenerating(true);
			try {
				const spec = await generatePresetEffect(presetKey, text, selectedTier);
				setGeneratedEffect({ spec, tier: selectedTier });
				onPreview?.(spec);
			} catch (error) {
				console.error("Failed to apply preset:", error);
			} finally {
				setIsGenerating(false);
			}
		},
		[text, selectedTier, onPreview],
	);

	const handleParamChange = useCallback(
		(nodeId: string, key: string, value: ParamValue) => {
			if (!generatedEffect) return;

			const updatedSpec: EffectGraphSpec = {
				...generatedEffect.spec,
				nodes: generatedEffect.spec.nodes.map((node) =>
					node.id === nodeId
						? { ...node, params: { ...node.params, [key]: value } }
						: node,
				),
			};

			setGeneratedEffect({ ...generatedEffect, spec: updatedSpec });
			onPreview?.(updatedSpec);
		},
		[generatedEffect, onPreview],
	);

	return (
		<ScrollView className="flex-1 bg-theme-background">
			<View className="p-4">
				<Text className="text-theme-text text-xl font-bold mb-4">
					Text Effect Editor
				</Text>

				<View className="mb-4">
					<Text className="text-theme-text-secondary text-sm mb-2">
						Text Content
					</Text>
					<TextInput
						value={text}
						onChangeText={setText}
						className="bg-theme-surface text-theme-text p-3 rounded-lg"
						placeholder="Enter text..."
						placeholderTextColor="#A89B7D"
						accessibilityLabel="Text content"
					/>
				</View>

				<View className="mb-4">
					<Text className="text-theme-text-secondary text-sm mb-2">
						Device Tier
					</Text>
					<View className="flex-row gap-2">
						{(["low", "mid", "high"] as DeviceTier[]).map((tier) => (
							<TouchableOpacity
								key={tier}
								onPress={() => setSelectedTier(tier)}
								className={`px-4 py-2 rounded-lg ${
									selectedTier === tier
										? "bg-theme-primary"
										: "bg-theme-surface"
								}`}
								accessibilityRole="button"
								accessibilityLabel={`${tier} device tier`}
								accessibilityState={{ selected: selectedTier === tier }}
							>
								<Text
									className={`capitalize ${selectedTier === tier ? "text-theme-secondary" : "text-theme-text-secondary"}`}
								>
									{tier}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<Text className="text-theme-text-tertiary text-xs mt-2">
						Max {limits.maxEffectsPerText} effects, {limits.maxSamples} samples
						{limits.enableBlur ? ", blur enabled" : ", no blur"}
					</Text>
				</View>

				<View className="mb-4">
					<Text className="text-theme-text-secondary text-sm mb-2">
						Presets
					</Text>
					<View className="flex-row flex-wrap gap-2">
						{Object.entries(TEXT_EFFECT_PRESETS).map(([key, preset]) => (
							<TouchableOpacity
								key={key}
								onPress={() =>
									handlePresetSelect(key as keyof typeof TEXT_EFFECT_PRESETS)
								}
								className="bg-theme-surface px-3 py-2 rounded-lg"
								accessibilityRole="button"
								accessibilityLabel={`${preset.name} preset, ${preset.tier} tier`}
							>
								<Text className="text-theme-text text-sm">{preset.name}</Text>
								<Text className="text-theme-text-tertiary text-xs">
									{preset.tier}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View className="mb-4">
					<Text className="text-theme-text-secondary text-sm mb-2">
						AI Description
					</Text>
					<TextInput
						value={description}
						onChangeText={setDescription}
						className="bg-theme-surface text-theme-text p-3 rounded-lg h-20"
						placeholder="Describe the effect (e.g., 'Neon sign with cyan glow')..."
						placeholderTextColor="#A89B7D"
						multiline
						accessibilityLabel="AI effect description"
					/>
					<TouchableOpacity
						onPress={handleGenerate}
						disabled={isGenerating || !description.trim()}
						className={`mt-2 p-3 rounded-lg ${
							isGenerating || !description.trim()
								? "bg-theme-surface-elevated"
								: "bg-theme-primary"
						}`}
						accessibilityRole="button"
						accessibilityLabel="Generate effect"
						accessibilityState={{
							disabled: isGenerating || !description.trim(),
						}}
					>
						{isGenerating ? (
							<ActivityIndicator color="#FDF8F0" />
						) : (
							<Text className="text-theme-secondary text-center font-semibold">
								Generate Effect
							</Text>
						)}
					</TouchableOpacity>
				</View>

				{generatedEffect && (
					<View className="mt-4">
						<Text className="text-theme-text text-lg font-semibold mb-2">
							Effect Parameters
						</Text>
						<EffectTuningPanel
							spec={generatedEffect.spec}
							onParamChange={handleParamChange}
						/>
						<TouchableOpacity
							onPress={() => onApply(generatedEffect.spec)}
							className="mt-4 bg-theme-success p-3 rounded-lg"
							accessibilityRole="button"
							accessibilityLabel="Apply effect to game"
						>
							<Text className="text-theme-text-inverse text-center font-semibold">
								Apply to Game
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</ScrollView>
	);
}

async function generateTextEffect(
	description: string,
	text: string,
	tier: DeviceTier,
): Promise<EffectGraphSpec> {
	const response = await fetch("/api/ai/generate-text-effect", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ description, text, tier }),
	});

	if (!response.ok) {
		throw new Error("Failed to generate text effect");
	}

	return response.json();
}

async function generatePresetEffect(
	preset: keyof typeof TEXT_EFFECT_PRESETS,
	text: string,
	tier: DeviceTier,
): Promise<EffectGraphSpec> {
	const response = await fetch("/api/ai/generate-text-preset", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ preset, text, tier }),
	});

	if (!response.ok) {
		throw new Error("Failed to generate preset effect");
	}

	return response.json();
}
