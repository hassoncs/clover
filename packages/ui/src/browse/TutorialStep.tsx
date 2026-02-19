import React from "react";
import { Image, Text, View } from "react-native";
import type { HowToPlayStep } from "./types";

interface TutorialStepProps {
	step: HowToPlayStep;
	isActive: boolean;
	index: number;
	totalSteps: number;
}

export function TutorialStep({
	step,
	isActive,
	index,
	totalSteps,
}: TutorialStepProps) {
	return (
		<View className="flex-1 bg-amen-navy rounded-3xl overflow-hidden border border-amen-gold/20">
			<View className="h-1/2 bg-amen-navy-light items-center justify-center relative overflow-hidden">
				{step.panelImageUrl ? (
					<Image
						source={{ uri: step.panelImageUrl }}
						className="w-full h-full"
						resizeMode="cover"
					/>
				) : (
					<View className="w-32 h-32 rounded-full bg-amen-gold/10 items-center justify-center border-2 border-amen-gold">
						<Text className="font-lora text-6xl text-amen-gold">
							{step.step}
						</Text>
					</View>
				)}

				<View className="absolute top-4 left-0 right-0 items-center">
					<View className="bg-amen-navy/80 px-3 py-1 rounded-full border border-amen-cream/10 backdrop-blur-sm">
						<Text className="font-inter text-xs text-amen-cream/60 uppercase tracking-widest">
							Step {index + 1} of {totalSteps}
						</Text>
					</View>
				</View>
			</View>

			<View className="h-1/2 p-8 items-center justify-center">
				<View className="w-full max-w-sm gap-6">
					<Text className="font-lora text-3xl text-amen-gold text-center leading-tight">
						{step.title}
					</Text>
					<Text className="font-inter text-lg text-amen-cream/90 text-center leading-relaxed">
						{step.body}
					</Text>
				</View>
			</View>
		</View>
	);
}
