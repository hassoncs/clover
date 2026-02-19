import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	SlideInDown,
	SlideOutDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GameConfig } from "@/lib/party/types";

interface GameSettingsSheetProps {
	visible: boolean;
	config: GameConfig;
	onChange: (config: GameConfig) => void;
	onClose: () => void;
}

function PillSelector<T extends string | number>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { label: string; value: T }[];
	onChange: (value: T) => void;
}) {
	return (
		<View className="gap-3">
			<Text className="text-theme-text-secondary text-sm font-medium uppercase tracking-widest">
				{label}
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ gap: 8 }}
			>
				{options.map((option) => {
					const isSelected = option.value === value;
					return (
						<Pressable
							key={String(option.value)}
							onPress={() => onChange(option.value)}
							className={`px-4 py-2 rounded-full border ${
								isSelected
									? "bg-theme-primary border-theme-primary"
									: "bg-theme-surface border-theme-border"
							}`}
						>
							<Text
								className={`font-medium ${
									isSelected ? "text-white" : "text-theme-text"
								}`}
							>
								{option.label}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

export function GameSettingsSheet({
	visible,
	config,
	onChange,
	onClose,
}: GameSettingsSheetProps) {
	const insets = useSafeAreaInsets();

	if (!visible) return null;

	return (
		<View className="absolute inset-0 z-50 justify-end">
			<Animated.View
				entering={FadeIn}
				exiting={FadeOut}
				className="absolute inset-0 bg-[#1B3A6B]/80"
			>
				<Pressable className="flex-1" onPress={onClose} />
			</Animated.View>

			<Animated.View
				entering={SlideInDown.springify().damping(15)}
				exiting={SlideOutDown}
				className="bg-[#1B3A6B] rounded-t-3xl overflow-hidden border-t border-theme-border/20 shadow-2xl"
				style={{ paddingBottom: insets.bottom + 20 }}
			>
				<View className="items-center py-4">
					<View className="w-12 h-1.5 bg-white/20 rounded-full" />
				</View>

				<View className="px-6 pb-6 border-b border-white/10 mb-6">
					<Text className="text-2xl font-bold text-white font-serif text-center">
						Game Settings
					</Text>
				</View>

				<ScrollView className="px-6 max-h-[60vh]">
					<View className="gap-8 pb-8">
						<PillSelector
							label="Rounds"
							value={config.rounds}
							options={[
								{ label: "3 Rounds", value: 3 },
								{ label: "5 Rounds", value: 5 },
								{ label: "7 Rounds", value: 7 },
							]}
							onChange={(rounds) => onChange({ ...config, rounds })}
						/>

						<PillSelector
							label="Content Pack"
							value={config.contentPack}
							options={[
								{ label: "Old Testament", value: "old-testament" },
								{ label: "New Testament", value: "new-testament" },
								{ label: "Full Bible", value: "full-bible" },
								{ label: "Advent & Lent", value: "advent-lent" },
							]}
							onChange={(contentPack) => onChange({ ...config, contentPack })}
						/>

						<PillSelector
							label="Difficulty"
							value={config.difficulty}
							options={[
								{ label: "Seeker", value: "seeker" },
								{ label: "Disciple", value: "disciple" },
								{ label: "Scholar", value: "scholar" },
							]}
							onChange={(difficulty) => onChange({ ...config, difficulty })}
						/>

						<PillSelector
							label="Timer"
							value={config.timerMode}
							options={[
								{ label: "Standard (30s)", value: "standard" },
								{ label: "Relaxed (60s)", value: "relaxed" },
								{ label: "No Timer", value: "none" },
							]}
							onChange={(timerMode) => onChange({ ...config, timerMode })}
						/>

						<View className="flex-row justify-between items-center py-2">
							<View>
								<Text className="text-theme-text-secondary text-sm font-medium uppercase tracking-widest mb-1">
									Audience Voting
								</Text>
								<Text className="text-white/60 text-sm">
									Allow audience to vote on answers
								</Text>
							</View>
							<Switch
								value={config.audienceVoting}
								onValueChange={(audienceVoting) =>
									onChange({ ...config, audienceVoting })
								}
								trackColor={{ false: "#334155", true: "#C9A84C" }}
								thumbColor={config.audienceVoting ? "#ffffff" : "#f4f3f4"}
							/>
						</View>
					</View>
				</ScrollView>

				<View className="px-6 pt-4">
					<Pressable
						onPress={onClose}
						className="w-full bg-[#C9A84C] p-4 rounded-2xl items-center active:opacity-90"
					>
						<Text className="text-[#1B3A6B] text-lg font-bold tracking-wide">
							DONE
						</Text>
					</Pressable>
				</View>
			</Animated.View>
		</View>
	);
}
