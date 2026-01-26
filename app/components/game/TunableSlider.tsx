import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

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
        <Text className="text-white font-medium">{label}</Text>
        <Text className="text-purple-400 font-mono">{currentValue.toFixed(2)}</Text>
      </View>
      {description && (
        <Text className="text-gray-500 text-xs mb-2">{description}</Text>
      )}
      <Slider
        value={currentValue}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor="#a855f7"
        maximumTrackTintColor="#374151"
        thumbTintColor="#a855f7"
      />
    </View>
  );
}
