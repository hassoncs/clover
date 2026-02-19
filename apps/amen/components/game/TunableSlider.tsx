import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";

interface TunableSliderProps {
	varKey: string;
	label: string;
	description?: string;
	currentValue: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
}

export function TunableSlider({
	varKey: _varKey,
	label,
	description,
	currentValue,
	min,
	max,
	step,
	onChange,
}: TunableSliderProps) {
	return (
		<View className="mb-4">
			<View className="flex-row justify-between mb-1">
				<Text className="text-theme-text font-medium">{label}</Text>
				<Text className="text-theme-primary font-mono">
					{currentValue.toFixed(2)}
				</Text>
			</View>
			{description && (
				<Text className="text-theme-text-secondary text-xs mb-2">
					{description}
				</Text>
			)}
			<Slider
				value={currentValue}
				minimumValue={min}
				maximumValue={max}
				step={step}
				onValueChange={onChange}
				minimumTrackTintColor="#C9A84C"
				maximumTrackTintColor="#1E3866"
				thumbTintColor="#C9A84C"
				accessibilityLabel={`${label} slider`}
				accessibilityValue={{ min, max, now: currentValue }}
			/>
		</View>
	);
}
