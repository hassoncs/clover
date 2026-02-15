import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { haptics } from "./haptics";
import type { KnobColorProps } from "./types";

const DEFAULT_PRESETS = [
	"#EF4444",
	"#F97316",
	"#EAB308",
	"#22C55E",
	"#3B82F6",
	"#8B5CF6",
	"#000000",
	"#FFFFFF",
];

export function KnobColor({
	label,
	description,
	value,
	presets = DEFAULT_PRESETS,
	onChange,
	disabled,
}: KnobColorProps) {
	const [customValue, setCustomValue] = useState(value);

	useEffect(() => {
		setCustomValue(value);
	}, [value]);

	const handlePresetPress = (color: string) => {
		if (disabled) return;
		haptics.selection();
		onChange(color);
	};

	const handleCustomChange = (text: string) => {
		setCustomValue(text);
		if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
			onChange(text);
		}
	};

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="flex-row justify-between mb-2 items-center">
				<Text className="text-white font-medium">{label}</Text>
			</View>

			{description && (
				<Text className="text-gray-400 text-xs mb-3">{description}</Text>
			)}

			<View className="flex-row flex-wrap gap-2 mb-3">
				{presets.map((color) => (
					<Pressable
						key={color}
						onPress={() => handlePresetPress(color)}
						className={`w-8 h-8 rounded-lg border-2 ${
							value === color ? "border-white" : "border-transparent"
						}`}
						style={{ backgroundColor: color, opacity: disabled ? 0.5 : 1 }}
						accessibilityLabel={`Select color ${color}`}
						accessibilityState={{ selected: value === color }}
						disabled={disabled}
					/>
				))}
			</View>

			<View className="flex-row items-center gap-2">
				<View
					className="w-8 h-8 rounded border border-gray-600"
					style={{ backgroundColor: value, opacity: disabled ? 0.5 : 1 }}
				/>
				<TextInput
					className="flex-1 bg-gray-800 text-white p-2 rounded border border-gray-700 font-mono"
					value={customValue}
					onChangeText={handleCustomChange}
					placeholder="#RRGGBB"
					placeholderTextColor="#6B7280"
					editable={!disabled}
					autoCapitalize="characters"
					maxLength={7}
				/>
			</View>
		</View>
	);
}
