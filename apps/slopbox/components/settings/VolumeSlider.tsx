import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";

interface VolumeSliderProps {
	label: string;
	value: number;
	onChange: (value: number) => void;
}

export function VolumeSlider({ label, value, onChange }: VolumeSliderProps) {
	return (
		<View className="mb-4">
			<View className="flex-row justify-between items-center mb-2">
				<Text className="text-theme-text font-medium text-base">{label}</Text>
				<Text className="text-theme-text-secondary text-sm font-tabular-nums">
					{Math.round(value * 100)}%
				</Text>
			</View>
			<Slider
				style={{ width: "100%", height: 40 }}
				minimumValue={0}
				maximumValue={1}
				value={value}
				onSlidingComplete={onChange}
				minimumTrackTintColor="#C9A84C"
				maximumTrackTintColor="#1B3A6B"
				thumbTintColor="#C9A84C"
			/>
		</View>
	);
}
