import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

export function Scoreboard({
	data,
	highlightWinner,
	size = "normal",
}: {
	data: Array<{ playerName: string; score: number }>;
	highlightWinner?: boolean;
	size?: "normal" | "large";
}) {
	const sortedData = [...data].sort((a, b) => b.score - a.score);

	const textSize = size === "large" ? "text-3xl" : "text-lg";
	const scoreSize = size === "large" ? "text-4xl" : "text-xl";
	const padding = size === "large" ? "p-6 mb-4" : "p-4 mb-3";
	const iconSize = size === "large" ? 48 : 24;
	const rankSize = size === "large" ? "w-12 h-12" : "w-8 h-8";

	return (
		<ScrollView
			className="w-full flex-1"
			contentContainerStyle={{ paddingBottom: 20 }}
		>
			{sortedData.map((player, index) => {
				const rank = index + 1;
				let rankColor = "bg-theme-surface-elevated";
				let textColor = "text-theme-text";

				if (rank === 1) {
					rankColor = "bg-theme-primary";
					textColor = "text-theme-secondary";
				} else if (rank === 2) {
					rankColor = "bg-theme-text-secondary";
					textColor = "text-theme-background";
				} else if (rank === 3) {
					rankColor = "bg-theme-text-tertiary";
					textColor = "text-theme-background";
				}

				return (
					<View
						key={player.playerName}
						className={`flex-row items-center ${padding} rounded-xl border border-theme-border ${rank === 1 && highlightWinner ? "bg-theme-primary/20 border-theme-primary" : "bg-theme-surface"}`}
					>
						<View
							className={`${rankSize} rounded-full items-center justify-center mr-4 ${rankColor}`}
						>
							<Text className={`font-bold ${textColor}`}>{rank}</Text>
						</View>
						<Text className={`flex-1 font-medium text-theme-text ${textSize}`}>
							{player.playerName}
						</Text>
						<Text className={`font-bold text-theme-primary ${scoreSize}`}>
							{player.score}
						</Text>
						{rank === 1 && highlightWinner && (
							<Ionicons
								name="trophy"
								size={iconSize}
								color="#C9A84C"
								className="ml-2"
							/>
						)}
					</View>
				);
			})}
		</ScrollView>
	);
}
