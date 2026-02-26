import { Pressable, Text, View } from "react-native";

type ChoiceGridProps = {
	choices: string[];
	onSelect: (index: number) => void;
	disabled?: boolean;
	columns?: 1 | 2;
	accentColor?: string;
};

export function ChoiceGrid({
	choices,
	onSelect,
	disabled,
	columns = 1,
	accentColor,
}: ChoiceGridProps) {
	return (
		<View
			className={`w-full gap-3 ${columns === 2 ? "flex-row flex-wrap" : ""}`}
		>
			{choices.map((choice, i) => (
				<Pressable
					key={`choice-${choice}`}
					onPress={() => !disabled && onSelect(i)}
					disabled={disabled}
					className={`bg-theme-surface rounded-xl border border-theme-border p-4 items-center active:opacity-80 ${
						columns === 2 ? "flex-1 min-w-[45%]" : "w-full"
					} ${disabled ? "opacity-50" : ""}`}
					style={accentColor ? { borderColor: accentColor } : undefined}
				>
					<Text className="text-theme-text text-base font-medium text-center">
						{choice}
					</Text>
				</Pressable>
			))}
		</View>
	);
}
