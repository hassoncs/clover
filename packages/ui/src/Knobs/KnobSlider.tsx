import Slider from "@react-native-community/slider";
import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { haptics } from "./haptics";
import type { KnobSliderProps } from "./types";

export function KnobSlider({
	label,
	description,
	value,
	min,
	max,
	step = 1,
	onChange,
}: KnobSliderProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value.toString());

	// Sync edit value if external value changes while not editing
	useEffect(() => {
		if (!isEditing) {
			setEditValue(value.toString());
		}
	}, [value, isEditing]);

	const handleCommit = () => {
		let newValue = parseFloat(editValue);
		if (isNaN(newValue)) {
			newValue = value;
		} else {
			newValue = Math.max(min, Math.min(max, newValue));
			if (step && step > 0) {
				newValue = Math.round(newValue / step) * step;
			}
		}
		onChange(newValue);
		setIsEditing(false);
		setEditValue(newValue.toString());
	};

	const getDisplayValue = () => {
		if (step && step % 1 !== 0) {
			const decimals = step.toString().split(".")[1]?.length || 0;
			return value.toFixed(decimals);
		}
		if (step && step >= 1 && step % 1 === 0) {
			return value.toFixed(0);
		}
		return value.toFixed(2);
	};

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="flex-row justify-between mb-2 items-center">
				<Text className="text-white font-medium">{label}</Text>
				{isEditing ? (
					<TextInput
						className="font-mono text-white bg-gray-800 rounded px-2 py-1 min-w-[80px] text-right"
						value={editValue}
						onChangeText={setEditValue}
						onBlur={handleCommit}
						onSubmitEditing={handleCommit}
						keyboardType="numeric"
						autoFocus
						selectTextOnFocus
						returnKeyType="done"
					/>
				) : (
					<Pressable
						onPress={() => {
							setEditValue(value.toString());
							setIsEditing(true);
						}}
						hitSlop={8}
					>
						<Text className="font-mono text-white py-1 px-2 bg-gray-800/50 rounded overflow-hidden">
							{getDisplayValue()}
						</Text>
					</Pressable>
				)}
			</View>

			{description && (
				<Text className="text-gray-400 text-xs mb-3">{description}</Text>
			)}

			<View className="h-11 justify-center">
				<Slider
					value={value}
					minimumValue={min}
					maximumValue={max}
					step={step}
					onValueChange={onChange}
					onSlidingComplete={() => haptics.selection()}
					minimumTrackTintColor="#a855f7"
					maximumTrackTintColor="#374151"
					thumbTintColor="#a855f7"
					accessibilityLabel={`${label} slider`}
					accessibilityValue={{ min, max, now: value }}
				/>
			</View>

			<View className="flex-row justify-between mt-1">
				<Text className="text-gray-500 text-xs">{min}</Text>
				<Text className="text-gray-500 text-xs">{max}</Text>
			</View>
		</View>
	);
}
