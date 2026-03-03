import { GameHallTile as SharedTile } from "@slopcade/ui";
import React from "react";
import { Image, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { PartyTemplate } from "@/lib/party/template-types";

interface GameHallTileProps {
	template: PartyTemplate;
	selected: boolean;
	onPress: () => void;
}

const TILE_WIDTH = 320;
const TILE_HEIGHT = 256;

export function GameHallTile({
	template,
	selected,
	onPress,
}: GameHallTileProps) {
	const animatedStyle = useAnimatedStyle(() => ({
		borderColor: selected ? "#f97316" : "rgba(255, 255, 255, 0.1)",
		borderWidth: selected ? 3 : 1,
	}));

	return (
		<SharedTile
			selected={selected}
			onPress={onPress}
			title={template.title}
			width={TILE_WIDTH}
			height={TILE_HEIGHT}
		>
			<Animated.View
				className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg flex-1"
				style={[animatedStyle]}
			>
				<View className="h-[60%] w-full bg-[#0f0f0f] items-center justify-center overflow-hidden relative">
					{template.thumbnailUrl ? (
						<Image
							source={{ uri: template.thumbnailUrl }}
							className="w-full h-full"
							resizeMode="cover"
						/>
					) : (
						<Text className="text-6xl">{template.emoji}</Text>
					)}

					<View className="absolute inset-0 bg-black/10" />
				</View>

				<View className="h-[40%] w-full p-4 items-center justify-between bg-[#1a1a1a]">
					<View className="items-center justify-center flex-1">
						<Text
							className="text-[#FFFDF7] text-xl text-center font-serif leading-tight"
							style={{ fontFamily: "Lora_700Bold" }}
							numberOfLines={2}
						>
							{template.title}
						</Text>
					</View>

					{template.formatTag && (
						<View className="bg-[#f97316]/10 px-3 py-1 rounded-full border border-[#f97316]/30">
							<Text className="text-[#f97316] text-xs font-bold uppercase tracking-wider">
								{template.formatTag}
							</Text>
						</View>
					)}
				</View>
			</Animated.View>
		</SharedTile>
	);
}
