export type { GameHallTileProps } from "./GameHallTile";
export { GameHallTile } from "./GameHallTile";

import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	useWindowDimensions,
	View,
	type ViewStyle,
} from "react-native";

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
	tileWidth?: number;
	tileHeight?: number;
	gap?: number;
	containerStyle?: ViewStyle;
}

const DEFAULT_TILE_WIDTH = 200;
const DEFAULT_GAP = 16;

export function GameHallCarousel<T extends CarouselItem>({
	items,
	selectedId,
	onSelect,
	renderTile,
	tileWidth = DEFAULT_TILE_WIDTH,
	gap = DEFAULT_GAP,
	containerStyle,
}: GameHallCarouselProps<T>) {
	const { width } = useWindowDimensions();
	const flatListRef = useRef<FlatList>(null);
	const itemSize = tileWidth + gap;
	const paddingHorizontal = (width - tileWidth) / 2;

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
		<View style={[{ height: 320, justifyContent: "center" }, containerStyle]}>
			<FlatList
				ref={flatListRef}
				data={items}
				keyExtractor={(item) => item.id}
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={itemSize}
				decelerationRate="fast"
				contentContainerStyle={{
					paddingHorizontal,
					gap,
					alignItems: "center",
				}}
				getItemLayout={(_, index) => ({
					length: itemSize,
					offset: itemSize * index,
					index,
				})}
				renderItem={({ item, index }) => (
					<View style={{ width: tileWidth }}>
						{renderTile(item, item.id === selectedId, () => {
							onSelect(item.id);
							scrollToCenter(index);
						})}
					</View>
				)}
				onMomentumScrollEnd={handleScrollEnd}
			/>
		</View>
	);
}
