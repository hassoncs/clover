import { Text, View } from "react-native";

export function Timer({ seconds }: { seconds: number }) {
	const isLow = seconds <= 5;

	return (
		<View className="w-full items-center mb-4">
			<View
				className={`w-16 h-16 rounded-full items-center justify-center border-4 ${isLow ? "border-red-500 bg-red-500/10" : "border-theme-primary bg-theme-primary/10"}`}
			>
				<Text
					className={`text-2xl font-bold ${isLow ? "text-red-500" : "text-theme-primary"}`}
				>
					{seconds}
				</Text>
			</View>
		</View>
	);
}
