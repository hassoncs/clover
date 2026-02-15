import Slider from "@react-native-community/slider";
import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { KnobVec3Props } from "./types";

const AxisSlider = ({
	label,
	value,
	min,
	max,
	step = 0.1,
	onChange,
	accessibilityLabel,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (val: number) => void;
	accessibilityLabel: string;
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value.toString());

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
		if (step && step >= 1 && step % 1 === 0) {
			return value.toFixed(0);
		}
		if (step && step % 1 !== 0) {
			const decimals = step.toString().split(".")[1]?.length || 2;
			return value.toFixed(decimals);
		}
		return value.toFixed(2);
	};

	return (
		<View className="mb-2">
			<View className="flex-row justify-between items-center mb-1">
				<Text className="text-gray-400 font-mono text-xs w-4">{label}</Text>
				{isEditing ? (
					<TextInput
						className="font-mono text-white bg-gray-800 rounded px-2 py-0.5 min-w-[60px] text-right text-xs"
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
						<Text className="font-mono text-white py-0.5 px-2 bg-gray-800/50 rounded overflow-hidden text-xs">
							{getDisplayValue()}
						</Text>
					</Pressable>
				)}
			</View>
			<Slider
				value={value}
				minimumValue={min}
				maximumValue={max}
				step={step}
				onValueChange={onChange}
				minimumTrackTintColor="#a855f7"
				maximumTrackTintColor="#374151"
				thumbTintColor="#a855f7"
				style={{ height: 20 }}
				accessibilityRole="adjustable"
				accessibilityLabel={accessibilityLabel}
				accessibilityHint="Swipe up or down to adjust"
			/>
		</View>
	);
};

export function KnobVec3({
	label,
	description,
	value,
	min = { x: -1, y: -1, z: -1 },
	max = { x: 1, y: 1, z: 1 },
	step = 0.1,
	onChange,
}: KnobVec3Props) {
	const handleChange = (axis: "x" | "y" | "z", val: number) => {
		onChange({ ...value, [axis]: val });
	};

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<Text className="text-white font-medium mb-1">{label}</Text>
			{description && (
				<Text className="text-gray-400 text-xs mb-3">{description}</Text>
			)}

			<AxisSlider
				label="X"
				value={value.x}
				min={min.x}
				max={max.x}
				step={step}
				onChange={(v) => handleChange("x", v)}
				accessibilityLabel={`${label} X axis`}
			/>
			<AxisSlider
				label="Y"
				value={value.y}
				min={min.y}
				max={max.y}
				step={step}
				onChange={(v) => handleChange("y", v)}
				accessibilityLabel={`${label} Y axis`}
			/>
			<AxisSlider
				label="Z"
				value={value.z}
				min={min.z}
				max={max.z}
				step={step}
				onChange={(v) => handleChange("z", v)}
				accessibilityLabel={`${label} Z axis`}
			/>
		</View>
	);
}
