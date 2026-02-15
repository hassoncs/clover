import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

export function Scoreboard({
	data,
	highlightWinner,
}: {
	data: Array<{ playerName: string; score: number }>;
	highlightWinner?: boolean;
}) {
	const sortedData = [...data].sort((a, b) => b.score - a.score);

	return (
		<ScrollView
			className="w-full flex-1"
			contentContainerStyle={{ paddingBottom: 20 }}
		>
			{sortedData.map((player, index) => {
				const rank = index + 1;
				let rankColor = "bg-theme-surface";
				let textColor = "text-theme-text";

				if (rank === 1) {
					rankColor = "bg-yellow-500";
					textColor = "text-black";
				} else if (rank === 2) {
					rankColor = "bg-gray-300";
					textColor = "text-black";
				} else if (rank === 3) {
					rankColor = "bg-orange-400";
					textColor = "text-black";
				}

				return (
					<View
						key={player.playerName}
						className={`flex-row items-center p-4 mb-3 rounded-xl border border-theme-border ${rank === 1 && highlightWinner ? "bg-yellow-500/20 border-yellow-500" : "bg-theme-surface"}`}
					>
						<View
							className={`w-8 h-8 rounded-full items-center justify-center mr-4 ${rankColor}`}
						>
							<Text className={`font-bold ${textColor}`}>{rank}</Text>
						</View>
						<Text className="flex-1 text-lg font-medium text-theme-text">
							{player.playerName}
						</Text>
						<Text className="text-xl font-bold text-theme-primary">
							{player.score}
						</Text>
						{rank === 1 && highlightWinner && (
							<Ionicons
								name="trophy"
								size={24}
								color="#EAB308"
								className="ml-2"
							/>
						)}
					</View>
				);
			})}
		</ScrollView>
	);
}
