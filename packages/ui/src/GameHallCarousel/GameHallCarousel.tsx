export type { GameHallTileProps } from "./GameHallTile";
export { GameHallTile } from "./GameHallTile";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	Pressable,
	StyleSheet,
	useWindowDimensions,
	View,
	type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
	Extrapolation,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

export interface CarouselItem {
	id: string;
	title: string;
}

export interface GameHallCarouselProps<T extends CarouselItem> {
	items: T[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	renderTile: (
		item: T,
		selected: boolean,
		onPress: () => void,
	) => React.ReactNode;
	getImageUrl?: (item: T) => string | null | undefined;
	tileWidth?: number;
	tileHeight?: number;
	gap?: number;
	containerStyle?: ViewStyle;
	reflectionColor?: string;
}

const DEFAULT_TILE_WIDTH = 280;
const DEFAULT_TILE_HEIGHT = 360;

function CarouselItemView<T extends CarouselItem>({
	displayIndex,
	item,
	progress,
	total,
	tileWidth,
	tileHeight,
	selectedId,
	onSelect,
	renderTile,
	scrollToIndex,
	reflectionColor,
}: {
	displayIndex: number;
	item: T;
	progress: SharedValue<number>;
	total: number;
	tileWidth: number;
	tileHeight: number;
	selectedId: string | null;
	onSelect: (id: string) => void;
	renderTile: (
		item: T,
		selected: boolean,
		onPress: () => void,
	) => React.ReactNode;
	scrollToIndex: (idx: number) => void;
	reflectionColor: string;
}) {
	const animatedStyle = useAnimatedStyle(() => {
		const normalizedProgress = ((progress.value % total) + total) % total;
		let diff = displayIndex - normalizedProgress;

		if (diff > total / 2) diff -= total;
		else if (diff < -total / 2) diff += total;

		const absDiff = Math.abs(diff);
		const sign = Math.sign(diff);

		const translateX = interpolate(
			absDiff,
			[0, 1, 2, 3],
			[
				0,
				tileWidth * 0.75 * sign,
				tileWidth * 1.1 * sign,
				tileWidth * 1.4 * sign,
			],
			Extrapolation.CLAMP,
		);

		const rotateY = interpolate(
			absDiff,
			[0, 1, 2, 3],
			[0, -35 * sign, -55 * sign, -70 * sign],
			Extrapolation.CLAMP,
		);

		const scale = interpolate(
			absDiff,
			[0, 1, 2, 3],
			[1, 0.85, 0.7, 0.5],
			Extrapolation.CLAMP,
		);

		const opacity = interpolate(
			absDiff,
			[0, 1, 2, 3],
			[1, 0.9, 0.5, 0],
			Extrapolation.CLAMP,
		);

		const zIndex = 1000 - Math.round(absDiff * 100);

		return {
			position: "absolute",
			width: tileWidth,
			height: tileHeight,
			opacity,
			zIndex,
			transform: [
				{ perspective: 1200 },
				{ translateX },
				{ scale },
				{ rotateY: `${rotateY}deg` },
			],
		};
	});

	const isSelected = item.id === selectedId;

	const handlePress = () => {
		onSelect(item.id);
		scrollToIndex(displayIndex);
	};

	return (
		<Animated.View style={animatedStyle}>
			<View style={{ flex: 1 }}>
				{renderTile(item, isSelected, handlePress)}
			</View>

			{/* Reflection */}
			<View
				style={{
					position: "absolute",
					top: tileHeight + 20, // gap for reflection
					width: tileWidth,
					height: tileHeight,
					transform: [{ scaleY: -1 }],
					opacity: 0.4,
				}}
				pointerEvents="none"
			>
				{renderTile(item, isSelected, () => {})}
				<LinearGradient
					colors={["transparent", reflectionColor]}
					style={StyleSheet.absoluteFill}
				/>
			</View>
		</Animated.View>
	);
}

export function GameHallCarousel<T extends CarouselItem>({
	items,
	selectedId,
	onSelect,
	renderTile,
	getImageUrl,
	tileWidth = DEFAULT_TILE_WIDTH,
	tileHeight = DEFAULT_TILE_HEIGHT,
	gap = 0,
	containerStyle,
	reflectionColor = "transparent",
}: GameHallCarouselProps<T>) {
	const { width: screenWidth } = useWindowDimensions();

	const displayItems = useMemo(() => {
		if (items.length === 0) return [];
		if (items.length >= 5) {
			return items.map((item, i) => ({ item, originalIndex: i, key: item.id }));
		}
		const multiplier = Math.ceil(5 / items.length);
		const result = [];
		for (let m = 0; m < multiplier; m++) {
			for (let i = 0; i < items.length; i++) {
				result.push({
					item: items[i],
					originalIndex: i,
					key: `${items[i].id}-copy-${m}`,
				});
			}
		}
		return result;
	}, [items]);

	const N = displayItems.length;
	const progress = useSharedValue(0);

	// Sync progress with selectedId
	useEffect(() => {
		if (selectedId && items.length > 0 && N > 0) {
			const index = items.findIndex((item) => item.id === selectedId);
			if (index !== -1) {
				const currentRounded = Math.round(progress.value);
				const currentMod = ((currentRounded % N) + N) % N;
				const currentOriginalIndex = displayItems[currentMod].originalIndex;

				if (currentOriginalIndex !== index) {
					// Find the closest instance of this originalIndex in our displayItems array
					let bestDiff = Infinity;
					for (let i = 0; i < N; i++) {
						if (displayItems[i].originalIndex === index) {
							let diff = i - currentMod;
							if (diff > N / 2) diff -= N;
							else if (diff < -N / 2) diff += N;

							if (Math.abs(diff) < Math.abs(bestDiff)) {
								bestDiff = diff;
							}
						}
					}
					const target = currentRounded + bestDiff;
					progress.value = withSpring(target, {
						damping: 20,
						stiffness: 100,
						mass: 1,
					});
				}
			}
		}
	}, [selectedId, items, N, displayItems]);

	const offsetStart = useSharedValue(0);
	const pan = Gesture.Pan()
		.onStart(() => {
			offsetStart.value = progress.value;
		})
		.onUpdate((e) => {
			progress.value = offsetStart.value - e.translationX / (tileWidth * 0.75);
		})
		.onEnd((e) => {
			const velocityOffset = -e.velocityX / 1000;
			const target = Math.round(progress.value + velocityOffset);
			progress.value = withSpring(target, { damping: 20, stiffness: 100 });

			const targetMod = ((target % N) + N) % N;
			if (displayItems[targetMod]) {
				const originalItem = displayItems[targetMod].item;
				if (originalItem.id !== selectedId) {
					runOnJS(onSelect)(originalItem.id);
				}
			}
		});

	const scrollToIndex = (idx: number) => {
		const currentRounded = Math.round(progress.value);
		const currentMod = ((currentRounded % N) + N) % N;
		let diff = idx - currentMod;
		if (diff > N / 2) diff -= N;
		else if (diff < -N / 2) diff += N;
		const target = currentRounded + diff;
		progress.value = withSpring(target, { damping: 20, stiffness: 100 });
	};

	const handleNext = () => {
		const target = Math.round(progress.value) + 1;
		progress.value = withSpring(target, { damping: 20, stiffness: 100 });
		const targetMod = ((target % N) + N) % N;
		if (displayItems[targetMod]) {
			onSelect(displayItems[targetMod].item.id);
		}
	};

	const handlePrev = () => {
		const target = Math.round(progress.value) - 1;
		progress.value = withSpring(target, { damping: 20, stiffness: 100 });
		const targetMod = ((target % N) + N) % N;
		if (displayItems[targetMod]) {
			onSelect(displayItems[targetMod].item.id);
		}
	};

	if (items.length === 0) return null;

	return (
		<View style={[styles.container, containerStyle]}>
			<GestureDetector gesture={pan}>
				<View style={[styles.carouselTrack, { height: tileHeight * 1.5 }]}>
					{displayItems.map((dItem, i) => (
						<CarouselItemView
							key={dItem.key}
							displayIndex={i}
							item={dItem.item}
							progress={progress}
							total={N}
							tileWidth={tileWidth}
							tileHeight={tileHeight}
							selectedId={selectedId}
							onSelect={onSelect}
							renderTile={renderTile}
							scrollToIndex={scrollToIndex}
							reflectionColor={reflectionColor}
						/>
					))}
				</View>
			</GestureDetector>

			<View style={styles.controls}>
				<Pressable
					onPress={handlePrev}
					style={styles.controlButton}
					accessibilityLabel="Previous game"
					accessibilityRole="button"
				>
					<Ionicons name="chevron-back" size={32} color="white" />
				</Pressable>
				<Pressable
					onPress={handleNext}
					style={styles.controlButton}
					accessibilityLabel="Next game"
					accessibilityRole="button"
				>
					<Ionicons name="chevron-forward" size={32} color="white" />
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	carouselTrack: {
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	controls: {
		flexDirection: "row",
		gap: 60,
		marginTop: 40,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2000,
	},
	controlButton: {
		padding: 12,
		borderRadius: 30,
		backgroundColor: "rgba(255, 255, 255, 0.1)",
	},
});
