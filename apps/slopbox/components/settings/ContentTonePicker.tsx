import { Pressable, Text, View } from "react-native";
import type { AppSettings } from "@/lib/settings/useAppSettings";

interface ContentTonePickerProps {
	value: AppSettings["contentTone"];
	onChange: (value: AppSettings["contentTone"]) => void;
}

const OPTIONS: { label: string; value: AppSettings["contentTone"] }[] = [
	{ label: "All Styles", value: "all" },
	{ label: "Casual", value: "casual" },
	{ label: "Chaotic", value: "chaotic" },
	{ label: "Competitive", value: "competitive" },
];

export function ContentTonePicker({ value, onChange }: ContentTonePickerProps) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{OPTIONS.map((option) => {
				const isSelected = value === option.value;
				return (
					<Pressable
						key={option.value}
						onPress={() => onChange(option.value)}
						className={`px-4 py-2 rounded-full border ${
							isSelected
								? "bg-theme-primary border-theme-primary"
								: "bg-transparent border-theme-primary"
						}`}
					>
						<Text
							className={`font-medium ${
								isSelected ? "text-theme-background" : "text-theme-text"
							}`}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
