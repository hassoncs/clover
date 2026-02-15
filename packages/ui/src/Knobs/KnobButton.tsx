import React from "react";
import { Pressable, Text, View } from "react-native";
import { haptics } from "./haptics";
import type { KnobButtonProps } from "./types";

export function KnobButton({
	label,
	action,
	variant = "default",
	onAction,
	disabled,
}: KnobButtonProps) {
	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<Pressable
				onPress={() => {
					haptics.medium();
					onAction(action);
				}}
				disabled={disabled}
				className={`w-full py-3 rounded-lg items-center justify-center ${
					disabled ? "opacity-50" : ""
				} ${
					variant === "destructive"
						? "bg-red-500 active:bg-red-400"
						: "bg-purple-500 active:bg-purple-400"
				}`}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityHint={disabled ? "Disabled" : `Triggers ${action} action`}
			>
				<Text className="text-white font-medium font-mono">{label}</Text>
			</Pressable>
		</View>
	);
}
