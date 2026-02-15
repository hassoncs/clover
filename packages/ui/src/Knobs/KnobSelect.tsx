import { Pressable, ScrollView, Text, View } from "react-native";
import { haptics } from "./haptics";
import type { KnobSelectProps } from "./types";

export function KnobSelect({
	label,
	description,
	value,
	options,
	onChange,
	disabled,
}: KnobSelectProps) {
	const isScrollable = options.length > 5;

	const renderOption = (option: KnobSelectProps["options"][0]) => {
		const isSelected = option.value === value;
		return (
			<Pressable
				key={option.value}
				onPress={() => {
					if (!disabled) {
						haptics.selection();
						onChange(option.value);
					}
				}}
				className={`
          ${isScrollable ? "mr-2 px-4 rounded-full" : "flex-1 rounded-md"}
          py-2 items-center justify-center border border-gray-600
          ${isSelected ? "bg-purple-500 border-purple-500" : "bg-gray-700 border-gray-600"}
          ${disabled ? "opacity-50" : ""}
        `}
			>
				<View className="flex-row items-center gap-2">
					{option.icon && <Text className="text-xs">{option.icon}</Text>}
					<Text
						className={`text-xs font-medium ${isSelected ? "text-white" : "text-gray-200"}`}
					>
						{option.label}
					</Text>
				</View>
			</Pressable>
		);
	};

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="mb-2">
				<Text className="text-white font-medium">{label}</Text>
				{description && (
					<Text className="text-gray-400 text-xs mt-1">{description}</Text>
				)}
			</View>

			{isScrollable ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					className="flex-row"
					contentContainerStyle={{ paddingRight: 16 }}
				>
					{options.map(renderOption)}
				</ScrollView>
			) : (
				<View className="flex-row gap-2">{options.map(renderOption)}</View>
			)}
		</View>
	);
}
