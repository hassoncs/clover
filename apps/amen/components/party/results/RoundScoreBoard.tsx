import { AmenIcon, HaloBadge } from "@slopcade/ui/amen";
import React, { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { getAudioManager } from "@/lib/audio/AudioManager";

interface RoundScoreBoardProps {
	players: Array<{
		name: string;
		avatarId?: string;
		score: number;
		scoreDelta: number;
	}>;
	round: number;
}

export function RoundScoreBoard({ players, round }: RoundScoreBoardProps) {
	const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

	useEffect(() => {
		const audio = getAudioManager();
		audio.playSfx("drumroll");

		const timer = setTimeout(() => {
			audio.playSfx("score-big");
		}, 2000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<View className="flex-1 bg-amen-navy">
			<View className="pt-12 pb-6 px-6 items-center">
				<Text className="font-lora text-amen-gold text-xl mb-2">
					Round {round}
				</Text>
				<Text className="font-lora text-4xl text-amen-cream font-bold">
					Standings
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
			>
				{sortedPlayers.map((player, index) => (
					<Animated.View
						key={player.name}
						entering={SlideInDown.delay(index * 200).springify()}
						className="mb-4"
					>
						<View className="flex-row items-center bg-amen-navy-800 p-4 rounded-xl border border-amen-gold/10">
							<View className="mr-4 w-8 items-center">
								<Text
									className={`font-lora font-bold text-xl ${
										index === 0 ? "text-amen-gold" : "text-amen-cream/60"
									}`}
								>
									{index + 1}
								</Text>
							</View>

							<View className="mr-4">
								<HaloBadge
									size={48}
									haloColor={index === 0 ? "#C9A84C" : "transparent"}
									backgroundColor={
										index === 0 ? "#C9A84C" : "rgba(255, 253, 247, 0.1)"
									}
								>
									{index === 0 ? (
										<AmenIcon name="crown" size={24} color="#1B3A6B" />
									) : (
										<Text className="font-lora font-bold text-amen-cream text-lg">
											{player.name.charAt(0).toUpperCase()}
										</Text>
									)}
								</HaloBadge>
							</View>

							<View className="flex-1">
								<Text className="font-inter font-bold text-amen-cream text-lg">
									{player.name}
								</Text>
							</View>

							<View className="items-end">
								<Text className="font-lora font-bold text-amen-gold text-2xl">
									{player.score}
								</Text>
								{player.scoreDelta > 0 && (
									<Animated.Text
										entering={SlideInDown.delay(2000 + index * 100)}
										className="font-inter font-bold text-amen-gold text-sm"
									>
										+{player.scoreDelta}
									</Animated.Text>
								)}
							</View>
						</View>
					</Animated.View>
				))}
			</ScrollView>
		</View>
	);
}
