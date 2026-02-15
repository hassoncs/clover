import React from "react";
import { Switch, Text, View } from "react-native";
import { haptics } from "./haptics";
import type { KnobToggleProps } from "./types";

export function KnobToggle({
	label,
	description,
	value,
	onChange,
	disabled,
}: KnobToggleProps) {
	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="flex-row justify-between items-center">
				<View className="flex-1 mr-4">
					<Text className="text-white font-medium">{label}</Text>
					{description && (
						<Text className="text-gray-400 text-xs mt-1">{description}</Text>
					)}
				</View>
				<Switch
					value={value}
					onValueChange={(val) => {
						haptics.light();
						onChange(val);
					}}
					disabled={disabled}
					trackColor={{ false: "#374151", true: "#a855f7" }}
					thumbColor="#fff"
					accessibilityLabel={label}
					accessibilityHint={description}
					accessibilityRole="switch"
				/>
			</View>
		</View>
	);
}
