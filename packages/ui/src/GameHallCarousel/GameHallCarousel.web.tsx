export type { GameHallTileProps } from "./GameHallTile";
export { GameHallTile } from "./GameHallTile";

import type React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

export interface CarouselItem {
	id: string;
	title: string;
}

export interface GameHallCarouselProps<T extends CarouselItem> {
	items: T[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	renderTile: (item: T, selected: boolean, onPress: () => void) => React.ReactNode;
	getImageUrl?: (item: T) => string | null | undefined;
	tileWidth?: number;
	tileHeight?: number;
	gap?: number;
	containerStyle?: ViewStyle;
	reflectionColor?: string;
}

const DEFAULT_TILE_WIDTH = 280;
const DEFAULT_TILE_HEIGHT = 360;

export function GameHallCarousel<T extends CarouselItem>({
	items,
	selectedId,
	onSelect,
	renderTile,
	tileWidth = DEFAULT_TILE_WIDTH,
	tileHeight = DEFAULT_TILE_HEIGHT,
	containerStyle,
}: GameHallCarouselProps<T>) {
	if (!items || items.length === 0) return null;

	const initialSlide = items.findIndex(item => item.id === selectedId) || 0;

	return (
		<View style={[styles.container, containerStyle]}>
			<Swiper
				effect={'coverflow'}
				grabCursor={true}
				centeredSlides={true}
				slidesPerView={'auto'}
				initialSlide={initialSlide > -1 ? initialSlide : 0}
				loop={true}
				onSlideChange={(swiper) => {
					const item = items[swiper.realIndex];
					if (item && item.id !== selectedId) {
						onSelect(item.id);
					}
				}}
				coverflowEffect={{
					rotate: 50,
					stretch: 0,
					depth: 100,
					modifier: 1,
					slideShadows: true,
				}}
				pagination={false}
				modules={[EffectCoverflow, Pagination]}
				className="mySwiper"
				style={{ width: '100%', height: tileHeight * 1.5, paddingTop: tileHeight * 0.25 }}
			>
				{items.map((item) => (
					<SwiperSlide key={item.id} style={{ width: tileWidth, height: tileHeight }}>
						{renderTile(item, item.id === selectedId, () => {
							onSelect(item.id);
						})}
					</SwiperSlide>
				))}
			</Swiper>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	}
});
