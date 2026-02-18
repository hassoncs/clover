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
						? "bg-green-500 border-green-600"
						: disabled
							? "bg-gray-500 border-gray-600 opacity-50"
							: "bg-red-500 border-red-600"
				}`}
			>
				{pressed ? (
					<Ionicons name="checkmark" size={80} color="white" />
				) : (
					<Text className="text-4xl font-black text-white tracking-wider">
						BUZZ!
					</Text>
				)}
			</Pressable>

			{pressed && (
				<Text className="text-xl font-bold text-green-400 animate-bounce">
					Buzzed in!
				</Text>
			)}
		</View>
	);
}
