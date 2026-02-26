import { AMEN_ICONS, AmenIcon, type AmenIconName } from "@slopcade/ui/amen";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface PlayerChipProps {
	name: string;
	avatarId?: string;
	isHost?: boolean;
	index?: number;
}

export function PlayerChip({
	name,
	avatarId,
	isHost,
	index = 0,
}: PlayerChipProps) {
	const isValidAvatar =
		avatarId && Object.keys(AMEN_ICONS).includes(avatarId as string);

	return (
		<Animated.View
			entering={FadeInDown.delay(index * 100).springify()}
			className="items-center gap-2"
		>
			<View
				className={`w-20 h-20 rounded-full items-center justify-center border-4 bg-theme-surface ${
					isHost ? "border-theme-primary" : "border-theme-surface-elevated"
				}`}
			>
				{isValidAvatar ? (
					<AmenIcon
						name={avatarId as AmenIconName}
						size={40}
						color={isHost ? "#C9A84C" : "#1B3A6B"}
					/>
				) : (
					<Text className="text-3xl font-bold text-theme-text">
						{name[0].toUpperCase()}
					</Text>
				)}
			</View>
			<View className="bg-theme-surface-elevated px-3 py-1 rounded-full border border-theme-border/50">
				<Text className="text-theme-text font-medium text-sm" numberOfLines={1}>
					{name}
				</Text>
			</View>
		</Animated.View>
	);
}
