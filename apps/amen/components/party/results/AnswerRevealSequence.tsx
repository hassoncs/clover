import { AmenIcon, MotifDivider } from "@slopcade/ui/amen";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { getAudioManager } from "@/lib/audio/AudioManager";

interface AnswerRevealSequenceProps {
	answers: Array<{
		text: string;
		authorName: string;
		voteCount: number;
	}>;
	onComplete?: () => void;
}

export function AnswerRevealSequence({
	answers,
	onComplete,
}: AnswerRevealSequenceProps) {
	const [revealedCount, setRevealedCount] = useState(0);

	useEffect(() => {
		if (revealedCount < answers.length) {
			const timer = setTimeout(() => {
				setRevealedCount((prev) => prev + 1);
				getAudioManager().playSfx("reveal");
			}, 2000);

			return () => clearTimeout(timer);
		} else {
			const timer = setTimeout(() => {
				onComplete?.();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [revealedCount, answers.length, onComplete]);

	return (
		<ScrollView
			className="flex-1 bg-amen-navy"
			contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
		>
			{answers.slice(0, revealedCount).map((answer, index) => (
				<Animated.View
					key={`${answer.authorName}-${index}`}
					entering={FadeInDown.springify().damping(12)}
					layout={Layout.springify()}
					className="mb-8"
				>
					<View className="bg-amen-navy-800 p-6 rounded-xl border border-amen-gold/20 shadow-lg">
						<Text className="font-lora text-2xl text-amen-cream mb-4 text-center leading-relaxed">
							"{answer.text}"
						</Text>

						<View className="flex-row justify-center items-center gap-2 mb-4">
							<View className="h-[1px] w-8 bg-amen-gold/30" />
							<AmenIcon name="scroll" size={16} color="#C9A84C" />
							<View className="h-[1px] w-8 bg-amen-gold/30" />
						</View>

						<Text className="font-inter font-bold text-amen-gold text-center uppercase tracking-widest text-sm">
							{answer.authorName}
						</Text>
					</View>

					{index < answers.length - 1 && (
						<View className="my-6 opacity-40">
							<MotifDivider
								icon="crossCeltic"
								color="#C9A84C"
								lineColor="rgba(201, 168, 76, 0.3)"
							/>
						</View>
					)}
				</Animated.View>
			))}
		</ScrollView>
	);
}
