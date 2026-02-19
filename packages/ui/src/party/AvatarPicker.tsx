import { AmenIcon, type AmenIconName } from "@slopcade/ui/amen";
import { Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	withSpring,
} from "react-native-reanimated";

const AVATARS: AmenIconName[] = [
	"dove",
	"lamb",
	"flame",
	"fish",
	"star",
	"scroll",
	"cross",
	"bread",
];

interface AvatarPickerProps {
	selectedId: string | null;
	onSelect: (id: string) => void;
}

function AvatarButton({
	id,
	selected,
	onSelect,
}: {
	id: AmenIconName;
	selected: boolean;
	onSelect: (id: string) => void;
}) {
	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ scale: withSpring(selected ? 1.1 : 1) }],
		};
	});

	return (
		<Pressable
			onPress={() => onSelect(id)}
			className="items-center justify-center"
		>
			<Animated.View
				style={animatedStyle}
				className={`w-16 h-16 rounded-full items-center justify-center border-2 ${
					selected
						? "bg-[#1B3A6B] border-[#C9A84C]"
						: "bg-white/10 border-white/20"
				}`}
			>
				<AmenIcon
					name={id}
					size={32}
					color={selected ? "#C9A84C" : "rgba(255, 255, 255, 0.6)"}
					glow={selected}
				/>
			</Animated.View>
		</Pressable>
	);
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
	return (
		<View className="flex-row flex-wrap justify-center gap-4">
			{AVATARS.map((id) => (
				<AvatarButton
					key={id}
					id={id}
					selected={selectedId === id}
					onSelect={onSelect}
				/>
			))}
		</View>
	);
}
