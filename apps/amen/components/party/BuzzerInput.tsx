import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function BuzzerInput({
	onPress,
	disabled,
	prompt,
}: {
	onPress: () => void;
	disabled?: boolean;
	prompt?: string;
}) {
	const [pressed, setPressed] = useState(false);

	const handlePress = () => {
		if (disabled || pressed) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		setPressed(true);
		onPress();
	};

	return (
		<View className="flex-1 w-full items-center justify-center gap-8">
			{prompt && (
				<Text className="text-2xl font-bold text-theme-text text-center px-4">
					{prompt}
				</Text>
			)}

			<Pressable
				onPress={handlePress}
				disabled={disabled || pressed}
				className={`w-64 h-64 rounded-full items-center justify-center border-8 shadow-lg active:scale-95 transition-transform ${
					pressed
						? "bg-theme-success border-theme-success"
						: disabled
							? "bg-theme-surface-elevated border-theme-border opacity-50"
							: "bg-theme-error border-theme-error"
				}`}
			>
				{pressed ? (
					<Ionicons name="checkmark" size={80} color="#FDF8F0" />
				) : (
					<Text className="text-4xl font-black text-theme-text-inverse tracking-wider">
						BUZZ!
					</Text>
				)}
			</Pressable>

			{pressed && (
				<Text className="text-xl font-bold text-theme-success animate-bounce">
					Buzzed in!
				</Text>
			)}
		</View>
	);
}
