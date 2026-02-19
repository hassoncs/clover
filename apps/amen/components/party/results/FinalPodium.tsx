import { AmenIcon, HaloBadge } from "@slopcade/ui/amen";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { getAudioManager } from "@/lib/audio/AudioManager";
import { ConfettiOverlay } from "./ConfettiOverlay";

interface FinalPodiumProps {
	players: Array<{
		name: string;
		avatarId?: string;
		score: number;
	}>;
	onPlayAgain: () => void;
	onBackToHall: () => void;
}

export function FinalPodium({
	players,
	onPlayAgain,
	onBackToHall,
}: FinalPodiumProps) {
	const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
	const [first, second, third] = sortedPlayers;

	useEffect(() => {
		const audio = getAudioManager();
		audio.playSfx("winner-fanfare");

		const timer = setTimeout(() => {
			audio.playSfx("crowd-cheer");
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<View className="flex-1 bg-amen-navy items-center justify-center p-6">
			<ConfettiOverlay />

			<Animated.View
				entering={FadeIn.delay(500).duration(1000)}
				className="mb-12 items-center"
			>
				<Text className="font-lora text-amen-gold text-3xl text-center font-bold mb-2">
					Well done, good and faithful servant!
				</Text>
				<Text className="font-inter text-amen-cream/60 text-lg">
					Matthew 25:23
				</Text>
			</Animated.View>

			<View className="flex-row items-end justify-center gap-4 mb-16 w-full max-w-lg h-64">
				{second && (
					<Animated.View
						entering={SlideInDown.delay(1000).springify()}
						className="items-center flex-1"
					>
						<View className="mb-2">
							<HaloBadge
								size={48}
								backgroundColor="rgba(255, 253, 247, 0.1)"
								haloColor="transparent"
							>
								<Text className="font-lora font-bold text-amen-cream text-lg">
									{second.name.charAt(0).toUpperCase()}
								</Text>
							</HaloBadge>
						</View>
						<Text
							className="font-inter font-bold text-amen-cream mb-1 text-center"
							numberOfLines={1}
						>
							{second.name}
						</Text>
						<Text className="font-lora text-amen-gold mb-2">
							{second.score}
						</Text>
						<View className="w-full h-32 bg-amen-navy-800 rounded-t-lg border-t border-x border-amen-gold/20 items-center justify-center">
							<Text className="font-lora font-bold text-4xl text-amen-cream/20">
								2
							</Text>
						</View>
					</Animated.View>
				)}

				{first && (
					<Animated.View
						entering={SlideInDown.delay(1500).springify()}
						className="items-center flex-1 z-10"
					>
						<View className="mb-2">
							<HaloBadge
								size={64}
								haloColor="#C9A84C"
								backgroundColor="#C9A84C"
							>
								<AmenIcon name="crown" size={32} color="#1B3A6B" />
							</HaloBadge>
						</View>
						<Text
							className="font-inter font-bold text-amen-gold mb-1 text-lg text-center"
							numberOfLines={1}
						>
							{first.name}
						</Text>
						<Text className="font-lora font-bold text-amen-gold text-xl mb-2">
							{first.score}
						</Text>
						<View className="w-full h-48 bg-amen-navy-700 rounded-t-lg border-t border-x border-amen-gold items-center justify-center shadow-lg shadow-amen-gold/20">
							<Text className="font-lora font-bold text-6xl text-amen-gold">
								1
							</Text>
						</View>
					</Animated.View>
				)}

				{third && (
					<Animated.View
						entering={SlideInDown.delay(1200).springify()}
						className="items-center flex-1"
					>
						<View className="mb-2">
							<HaloBadge
								size={48}
								backgroundColor="rgba(255, 253, 247, 0.05)"
								haloColor="transparent"
							>
								<Text className="font-lora font-bold text-amen-cream text-lg">
									{third.name.charAt(0).toUpperCase()}
								</Text>
							</HaloBadge>
						</View>
						<Text
							className="font-inter font-bold text-amen-cream/80 mb-1 text-center"
							numberOfLines={1}
						>
							{third.name}
						</Text>
						<Text className="font-lora text-amen-gold/80 mb-2">
							{third.score}
						</Text>
						<View className="w-full h-24 bg-amen-navy-900 rounded-t-lg border-t border-x border-amen-gold/10 items-center justify-center">
							<Text className="font-lora font-bold text-4xl text-amen-cream/10">
								3
							</Text>
						</View>
					</Animated.View>
				)}
			</View>

			<View className="w-full max-w-xs gap-4">
				<Pressable
					onPress={onPlayAgain}
					className="bg-amen-gold active:bg-amen-gold-light py-4 px-8 rounded-full items-center shadow-lg"
				>
					<Text className="font-inter font-bold text-amen-navy uppercase tracking-wider">
						Play Again
					</Text>
				</Pressable>

				<Pressable
					onPress={onBackToHall}
					className="bg-transparent border border-amen-gold/30 active:bg-amen-gold/10 py-4 px-8 rounded-full items-center"
				>
					<Text className="font-inter font-bold text-amen-gold uppercase tracking-wider">
						Back to The Hall
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
