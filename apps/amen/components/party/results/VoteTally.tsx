import { AmenIcon } from "@slopcade/ui/amen";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { getAudioManager } from "@/lib/audio/AudioManager";

interface VoteTallyProps {
	answers: Array<{
		text: string;
		voteCount: number;
		isWinner: boolean;
	}>;
	totalVotes: number;
}

function VoteBar({
	percentage,
	isWinner,
	index,
}: {
	percentage: number;
	isWinner: boolean;
	index: number;
}) {
	const width = useSharedValue(0);

	useEffect(() => {
		width.value = withDelay(
			index * 200,
			withTiming(percentage, {
				duration: 1000,
				easing: Easing.out(Easing.cubic),
			}),
		);

		if (percentage > 0) {
			setTimeout(() => {
				getAudioManager().playSfx("score-up");
			}, index * 200);
		}
	}, [percentage, index, width]);

	const style = useAnimatedStyle(() => ({
		width: `${width.value}%`,
	}));

	return (
		<View className="h-12 bg-amen-navy-800 rounded-lg overflow-hidden mb-2 border border-amen-gold/10">
			<Animated.View
				style={[
					style,
					{
						height: "100%",
						backgroundColor: isWinner ? "#C9A84C" : "rgba(255, 253, 247, 0.2)",
					},
				]}
			/>
			<View className="absolute inset-0 flex-row items-center justify-between px-4">
				{isWinner && (
					<View className="mr-2">
						<AmenIcon
							name="crown"
							size={16}
							color={isWinner ? "#1B3A6B" : "#FFFDF7"}
						/>
					</View>
				)}
			</View>
		</View>
	);
}

export function VoteTally({ answers, totalVotes }: VoteTallyProps) {
	return (
		<View className="w-full max-w-md">
			{answers.map((answer, index) => {
				const percentage =
					totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;

				return (
					<View key={answer.text} className="mb-4">
						<View className="flex-row justify-between items-end mb-1 px-1">
							<Text
								className="font-inter text-amen-cream text-base flex-1 mr-4"
								numberOfLines={1}
							>
								{answer.text}
							</Text>
							<Text
								className={`font-lora font-bold text-lg ${answer.isWinner ? "text-amen-gold" : "text-amen-cream/60"}`}
							>
								{answer.voteCount}
							</Text>
						</View>
						<VoteBar
							percentage={percentage}
							isWinner={answer.isWinner}
							index={index}
						/>
					</View>
				);
			})}
		</View>
	);
}
