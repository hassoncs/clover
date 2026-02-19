import { View, Text, Pressable } from "react-native";

interface CreditBalanceProps {
	balanceSparks?: number;
	isLoading?: boolean;
	onPress?: () => void;
}

export function CreditBalance({
	balanceSparks,
	isLoading,
	onPress,
}: CreditBalanceProps) {
	const content = (
		<View className="flex-row items-center bg-amber-100 rounded-full px-3 py-1 border border-amber-200">
			<Text className="text-sm">⚡</Text>
			<Text className="text-amber-700 font-bold text-sm ml-1">
				{isLoading ? "..." : balanceSparks?.toLocaleString() ?? "0"}
			</Text>
		</View>
	);

	if (onPress) {
		return (
			<Pressable
				onPress={onPress}
				className="active:opacity-80"
				accessibilityRole="button"
				accessibilityLabel={`Sparks balance: ${balanceSparks ?? 0}`}
			>
				{content}
			</Pressable>
		);
	}

	return content;
}
