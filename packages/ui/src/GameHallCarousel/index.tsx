export type { GameHallTileProps } from "./GameHallTile";
export { GameHallTile } from "./GameHallTile";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Image,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	StyleSheet,
	useWindowDimensions,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	interpolate,
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
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
}

const DEFAULT_TILE_WIDTH = 200;
const DEFAULT_GAP = 16;

function BlurredBackground({
	currentUrl,
	previousUrl,
	transitioning,
}: {
	currentUrl: string | null;
	previousUrl: string | null;
	transitioning: boolean;
}) {
	const opacity = useSharedValue(transitioning ? 0 : 1);

	useEffect(() => {
		opacity.value = withTiming(1, { duration: 600 });
	}, [currentUrl, opacity]);

	const frontStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const backStyle = useAnimatedStyle(() => ({
		opacity: 1 - opacity.value,
	}));

	return (
		<View style={StyleSheet.absoluteFill}>
			{previousUrl && (
				<Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
					<Image
						source={{ uri: previousUrl }}
						style={StyleSheet.absoluteFill}
						resizeMode="cover"
						blurRadius={60}
					/>
					<View
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: "rgba(0,0,0,0.55)" },
						]}
					/>
				</Animated.View>
			)}
			{currentUrl && (
				<Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
					<Image
						source={{ uri: currentUrl }}
						style={StyleSheet.absoluteFill}
						resizeMode="cover"
						blurRadius={60}
					/>
					<View
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: "rgba(0,0,0,0.55)" },
						]}
					/>
				</Animated.View>
			)}
		</View>
	);
}

function ScalingWrapper({
	index,
	scrollX,
	itemSize,
	tileWidth,
	children,
}: {
	index: number;
	scrollX: SharedValue<number>;
	itemSize: number;
	tileWidth: number;
	children: React.ReactNode;
}) {
	const animatedStyle = useAnimatedStyle(() => {
		const center = index * itemSize;
		const distance = Math.abs(scrollX.value - center);
		const scale = interpolate(
			distance,
			[0, itemSize, itemSize * 2],
			[1.35, 0.7, 0.55],
			"clamp",
		);
		const opacity = interpolate(
			distance,
			[0, itemSize, itemSize * 2.5],
			[1, 0.6, 0.35],
			"clamp",
		);
		return {
			transform: [{ scale }],
			opacity,
		};
	});

	return (
		<Animated.View style={[{ width: tileWidth }, animatedStyle]}>
			{children}
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
	gap = DEFAULT_GAP,
	containerStyle,
}: GameHallCarouselProps<T>) {
	const { width } = useWindowDimensions();
	const flatListRef = useRef<Animated.FlatList<T>>(null);
	const scrollX = useSharedValue(0);
	const itemSize = tileWidth + gap;
	const paddingHorizontal = (width - tileWidth) / 2;
	const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);

	const selectedItem = items.find((item) => item.id === selectedId);
	const currentImageUrl =
		selectedItem && getImageUrl ? (getImageUrl(selectedItem) ?? null) : null;

	useEffect(() => {
		return () => {
			if (currentImageUrl) {
				setPreviousImageUrl(currentImageUrl);
			}
		};
	}, [currentImageUrl]);

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollX.value = event.contentOffset.x;
		},
	});

	const scrollToCenter = useCallback(
		(index: number, animated = true) => {
			const offset = index * itemSize;
			flatListRef.current?.scrollToOffset({ offset, animated });
		},
		[itemSize],
	);

	useEffect(() => {
		if (selectedId && items.length > 0) {
			const index = items.findIndex((item) => item.id === selectedId);
			if (index !== -1) {
				scrollToCenter(index);
			}
		}
	}, [selectedId, items, scrollToCenter]);

	const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetX = event.nativeEvent.contentOffset.x;
		const index = Math.round(offsetX / itemSize);
		const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
		const item = items[clampedIndex];
		if (item && item.id !== selectedId) {
			onSelect(item.id);
		}
	};

	return (
		<View
			style={[
				{ flex: 1, justifyContent: "center", overflow: "hidden" },
				containerStyle,
			]}
		>
			{getImageUrl && (
				<BlurredBackground
					currentUrl={currentImageUrl}
					previousUrl={previousImageUrl}
					transitioning={currentImageUrl !== previousImageUrl}
				/>
			)}
			<Animated.FlatList
				ref={flatListRef as any}
				data={items}
				keyExtractor={(item: T) => item.id}
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={itemSize}
				decelerationRate="fast"
				onScroll={scrollHandler}
				scrollEventThrottle={16}
				contentContainerStyle={{
					paddingHorizontal,
					gap,
					alignItems: "center",
				}}
				getItemLayout={(_: any, index: number) => ({
					length: itemSize,
					offset: itemSize * index,
					index,
				})}
				renderItem={({ item, index }: { item: T; index: number }) => (
					<ScalingWrapper
						index={index}
						scrollX={scrollX}
						itemSize={itemSize}
						tileWidth={tileWidth}
					>
						{renderTile(item, item.id === selectedId, () => {
							onSelect(item.id);
							scrollToCenter(index);
						})}
					</ScalingWrapper>
				)}
				onMomentumScrollEnd={handleScrollEnd}
			/>
		</View>
	);
}
