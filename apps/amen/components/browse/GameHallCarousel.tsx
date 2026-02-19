import React, { useEffect, useRef } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	useWindowDimensions,
	View,
} from "react-native";
import type { PartyTemplate } from "@/lib/party/template-types";
import { GameHallTile } from "./GameHallTile";

interface GameHallCarouselProps {
	templates: PartyTemplate[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}

const TILE_WIDTH = 200;
const GAP = 16;
const ITEM_SIZE = TILE_WIDTH + GAP;

export function GameHallCarousel({
	templates,
	selectedId,
	onSelect,
}: GameHallCarouselProps) {
	const { width } = useWindowDimensions();
	const flatListRef = useRef<FlatList>(null);

	const paddingHorizontal = (width - TILE_WIDTH) / 2;

	useEffect(() => {
		if (selectedId && templates.length > 0) {
			const index = templates.findIndex((t) => t.id === selectedId);
			if (index !== -1) {
				flatListRef.current?.scrollToIndex({
					index,
					animated: true,
					viewPosition: 0.5,
				});
			}
		}
	}, [selectedId, templates]);

	const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetX = event.nativeEvent.contentOffset.x;
		const index = Math.round(offsetX / ITEM_SIZE);
		const clampedIndex = Math.max(0, Math.min(index, templates.length - 1));
		const template = templates[clampedIndex];
		if (template && template.id !== selectedId) {
			onSelect(template.id);
		}
	};

	return (
		<View className="h-[320px] justify-center">
			<FlatList
				ref={flatListRef}
				data={templates}
				keyExtractor={(item) => item.id}
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={ITEM_SIZE}
				decelerationRate="fast"
				contentContainerStyle={{
					paddingHorizontal,
					gap: GAP,
					alignItems: "center",
				}}
				getItemLayout={(_, index) => ({
					length: ITEM_SIZE,
					offset: ITEM_SIZE * index,
					index,
				})}
				renderItem={({ item }) => (
					<GameHallTile
						template={item}
						selected={item.id === selectedId}
						onPress={() => {
							onSelect(item.id);
							const index = templates.findIndex((t) => t.id === item.id);
							flatListRef.current?.scrollToIndex({
								index,
								animated: true,
								viewPosition: 0.5,
							});
						}}
					/>
				)}
				onMomentumScrollEnd={handleScrollEnd}
			/>
		</View>
	);
}
