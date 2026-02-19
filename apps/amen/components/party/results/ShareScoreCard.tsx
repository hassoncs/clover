import { AmenIcon, HaloBadge, MotifDivider } from "@slopcade/ui/amen";
import React from "react";
import { Pressable, Share, Text, View } from "react-native";

interface ShareScoreCardProps {
	gameName: string;
	players: Array<{ name: string; score: number }>;
	onShare?: () => void;
}

export function ShareScoreCard({
	gameName,
	players,
	onShare,
}: ShareScoreCardProps) {
	const topPlayers = players.sort((a, b) => b.score - a.score).slice(0, 3);

	const handleShare = async () => {
		try {
			const winner = topPlayers[0];
			const message = `I just played ${gameName} on Amen! ${winner.name} won with ${winner.score} points. Come play with us!`;

			const result = await Share.share({
				message,
				title: `Amen: ${gameName} Results`,
				url: "https://amen.games",
			});

			if (result.action === Share.sharedAction) {
				onShare?.();
			}
		} catch (error) {
			console.error("Error sharing:", error);
		}
	};

	return (
		<View className="w-full max-w-sm bg-amen-navy-800 rounded-xl border border-amen-gold/30 overflow-hidden">
			<View className="p-6 items-center bg-amen-navy-900/50">
				<View className="mb-3">
					<HaloBadge
						size={48}
						haloColor="#C9A84C"
						backgroundColor="transparent"
					>
						<AmenIcon name="crown" size={24} color="#C9A84C" />
					</HaloBadge>
				</View>
				<Text className="font-lora text-2xl text-amen-gold text-center">
					{gameName}
				</Text>
				<Text className="font-inter text-amen-cream/60 text-sm mt-1">
					Final Results
				</Text>
			</View>

			<View className="opacity-50">
				<MotifDivider
					icon="star"
					color="#C9A84C"
					lineColor="rgba(201, 168, 76, 0.3)"
				/>
			</View>

			<View className="p-6 gap-4">
				{topPlayers.map((player, index) => (
					<View
						key={player.name}
						className="flex-row items-center justify-between"
					>
						<View className="flex-row items-center gap-3">
							<View
								className={`w-8 h-8 rounded-full items-center justify-center ${
									index === 0
										? "bg-amen-gold"
										: index === 1
											? "bg-amen-cream/20"
											: "bg-amen-cream/10"
								}`}
							>
								<Text
									className={`font-lora font-bold ${
										index === 0 ? "text-amen-navy" : "text-amen-cream"
									}`}
								>
									{index + 1}
								</Text>
							</View>
							<Text className="font-inter font-medium text-amen-cream text-lg">
								{player.name}
							</Text>
						</View>
						<Text className="font-lora font-bold text-amen-gold text-xl">
							{player.score}
						</Text>
					</View>
				))}
			</View>

			<View className="p-4 bg-amen-navy-900/30 border-t border-amen-gold/10">
				<Pressable
					onPress={handleShare}
					className="bg-amen-gold active:bg-amen-gold-light py-3 px-6 rounded-full flex-row items-center justify-center gap-2"
				>
					<AmenIcon name="scroll" size={18} color="#1B3A6B" />
					<Text className="font-inter font-bold text-amen-navy uppercase tracking-wider text-sm">
						Share Results
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
