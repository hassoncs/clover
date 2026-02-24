import { GameHallTile as SharedTile } from "@slopcade/ui";
import React from "react";
import { Image, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
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
		borderColor: selected
			? withTiming("#A855F7", { duration: 300 })
			: withTiming("rgba(99, 102, 241, 0.25)", { duration: 300 }),
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
				className="rounded-2xl overflow-hidden shadow-lg flex-1"
				style={[
					{
						backgroundColor: "#1A1A2E",
					},
					animatedStyle,
				]}
			>
				<View
					className="items-center justify-center overflow-hidden relative"
					style={{ height: "60%", backgroundColor: "#0D0D1A" }}
				>
					{template.thumbnailUrl ? (
						<Image
							source={{ uri: template.thumbnailUrl }}
							style={{ width: "100%", height: "100%" }}
							resizeMode="cover"
						/>
					) : (
						<Text className="text-6xl">{template.emoji}</Text>
					)}
					<View className="absolute inset-0 bg-black/10" />
				</View>

				<View
					className="items-center justify-between p-4"
					style={{ height: "40%", backgroundColor: "#1A1A2E" }}
				>
					<View className="items-center justify-center flex-1">
						<Text
							className="text-white text-center leading-tight"
							style={{ fontFamily: "Lora-Bold", fontSize: 17 }}
							numberOfLines={2}
						>
							{template.title}
						</Text>
					</View>

					{template.formatTag && (
						<View
							className="px-3 py-1 rounded-full"
							style={{
								backgroundColor: "rgba(99, 102, 241, 0.15)",
								borderWidth: 1,
								borderColor: "rgba(99, 102, 241, 0.4)",
							}}
						>
							<Text
								className="text-xs font-bold uppercase tracking-wider"
								style={{ color: "#A5B4FC" }}
							>
								{template.formatTag}
							</Text>
						</View>
					)}
				</View>
			</Animated.View>
		</SharedTile>
	);
}
