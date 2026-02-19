import { AmenIcon } from "@slopcade/ui/amen";
import React, { useRef, useState } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { TutorialStep } from "./TutorialStep";
import type { HowToPlayStep } from "./types";

interface TutorialPagerProps {
	steps: HowToPlayStep[];
	onDone: () => void;
}

export function TutorialPager({ steps, onDone }: TutorialPagerProps) {
	const { width, height } = useWindowDimensions();
	const [currentIndex, setCurrentIndex] = useState(0);
	const flatListRef = useRef<FlatList>(null);

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const contentOffsetX = event.nativeEvent.contentOffset.x;
		const index = Math.round(contentOffsetX / width);
		if (index !== currentIndex) {
			setCurrentIndex(index);
		}
	};

	const scrollToIndex = (index: number) => {
		flatListRef.current?.scrollToIndex({ index, animated: true });
	};

	const handleNext = () => {
		if (currentIndex < steps.length - 1) {
			scrollToIndex(currentIndex + 1);
		}
	};

	const handleBack = () => {
		if (currentIndex > 0) {
			scrollToIndex(currentIndex - 1);
		}
	};

	const isLastStep = currentIndex === steps.length - 1;

	return (
		<View className="flex-1 bg-amen-navy">
			<FlatList
				ref={flatListRef}
				data={steps}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				keyExtractor={(item) => item.step.toString()}
				renderItem={({ item, index }) => (
					<View style={{ width, height: height - 120 }} className="p-4">
						<TutorialStep
							step={item}
							isActive={index === currentIndex}
							index={index}
							totalSteps={steps.length}
						/>
					</View>
				)}
			/>

			<View className="h-[120px] pb-8 px-6 justify-between">
				<View className="flex-row justify-center gap-2 mb-6">
					{steps.map((_, index) => (
						<View
							key={index}
							className={`h-2 rounded-full transition-all ${
								index === currentIndex
									? "w-6 bg-amen-gold"
									: "w-2 bg-amen-gold/30"
							}`}
						/>
					))}
				</View>

				<View className="flex-row items-center justify-between">
					<View className="w-24">
						{currentIndex > 0 && (
							<Pressable
								onPress={handleBack}
								className="flex-row items-center gap-2 active:opacity-70"
							>
								<AmenIcon
									name="arrowLeft"
									size={20}
									color="rgba(255, 253, 247, 0.6)"
								/>
								<Text className="font-inter font-bold text-amen-cream/60 uppercase tracking-wider text-sm">
									Back
								</Text>
							</Pressable>
						)}
					</View>

					<View className="flex-1 items-center">
						{isLastStep ? (
							<Pressable
								onPress={onDone}
								className="bg-amen-gold px-8 py-3 rounded-full active:opacity-90 shadow-lg shadow-amen-gold/20"
							>
								<Text className="font-inter font-bold text-amen-navy uppercase tracking-widest">
									Got It
								</Text>
							</Pressable>
						) : (
							<Pressable
								onPress={handleNext}
								className="flex-row items-center gap-2 active:opacity-70"
							>
								<Text className="font-inter font-bold text-amen-gold uppercase tracking-wider text-sm">
									Next
								</Text>
								<AmenIcon name="arrowRight" size={20} color="#C9A84C" />
							</Pressable>
						)}
					</View>

					<View className="w-24" />
				</View>
			</View>
		</View>
	);
}
