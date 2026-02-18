import { Text, View } from "react-native";

export function PromptCard({
	text,
	size = "normal",
}: {
	text: string;
	size?: "normal" | "large";
}) {
	const textSize = size === "large" ? "text-4xl" : "text-2xl";
	const padding = size === "large" ? "p-8" : "p-6";

	return (
		<View
			className={`w-full bg-theme-surface ${padding} rounded-2xl border border-theme-border shadow-sm mb-6`}
		>
			<Text
				className={`${textSize} font-bold text-theme-text text-center leading-tight`}
			>
				{text}
			</Text>
		</View>
	);
}
