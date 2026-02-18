import { Text, View } from "react-native";

export function Timer({
	seconds,
	size = "normal",
}: {
	seconds: number;
	size?: "normal" | "large";
}) {
	const isLow = seconds <= 5;
	const containerSize =
		size === "large" ? "w-32 h-32 border-8" : "w-16 h-16 border-4";
	const textSize = size === "large" ? "text-5xl" : "text-2xl";

	return (
		<View className="w-full items-center mb-4">
			<View
				className={`${containerSize} rounded-full items-center justify-center ${isLow ? "border-red-500 bg-red-500/10" : "border-theme-primary bg-theme-primary/10"}`}
			>
				<Text
					className={`${textSize} font-bold ${isLow ? "text-red-500" : "text-theme-primary"}`}
				>
					{seconds}
				</Text>
			</View>
		</View>
	);
}
