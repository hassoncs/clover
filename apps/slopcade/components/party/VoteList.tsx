import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";

export function VoteList({
	options,
	onVote,
	disabled,
}: {
	options: Array<{ id: string; text: string }>;
	onVote: (answerId: string) => void;
	disabled?: boolean;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const handleVote = (id: string) => {
		if (disabled || selectedId) return;
		setSelectedId(id);
		onVote(id);
	};

	return (
		<ScrollView
			className="w-full flex-1"
			contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
		>
			{options.map((option) => (
				<Pressable
					key={option.id}
					onPress={() => handleVote(option.id)}
					disabled={disabled || !!selectedId}
					className={`w-full p-4 rounded-xl border-2 active:opacity-90 ${
						selectedId === option.id
							? "bg-theme-primary border-theme-primary"
							: "bg-theme-surface border-theme-border"
					} ${disabled && selectedId !== option.id ? "opacity-50" : ""}`}
				>
					<Text
						className={`text-lg font-medium text-center ${selectedId === option.id ? "text-white" : "text-theme-text"}`}
					>
						{option.text}
					</Text>
				</Pressable>
			))}
		</ScrollView>
	);
}
