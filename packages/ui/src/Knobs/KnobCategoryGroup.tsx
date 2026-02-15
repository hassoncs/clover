import clsx from "clsx";
import type React from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	Layout,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

export const CATEGORY_ORDER = [
	"gameplay",
	"physics",
	"visuals",
	"economy",
	"ai",
	"other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
	gameplay: "🎮 Gameplay",
	physics: "⚛️ Physics",
	visuals: "✨ Visuals",
	economy: "💰 Economy",
	ai: "🤖 AI",
	other: "📦 Other",
};

export interface KnobCategoryGroupProps {
	category: string;
	title?: string;
	defaultExpanded?: boolean;
	children: React.ReactNode;
	itemCount?: number;
}

export function KnobCategoryGroup({
	category,
	title,
	defaultExpanded = true,
	children,
	itemCount,
}: KnobCategoryGroupProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const rotate = useSharedValue(defaultExpanded ? 90 : 0);

	const handlePress = () => {
		const nextState = !isExpanded;
		setIsExpanded(nextState);
		rotate.value = withTiming(nextState ? 90 : 0, { duration: 200 });
	};

	const chevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotate.value}deg` }],
	}));

	const displayTitle = title || CATEGORY_LABELS[category] || category;

	return (
		<Animated.View
			layout={Layout.duration(200)}
			className="mb-4 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
		>
			<Pressable
				onPress={handlePress}
				className={clsx(
					"flex-row items-center justify-between p-3",
					isExpanded ? "bg-gray-800/80" : "bg-transparent",
				)}
			>
				<View className="flex-row items-center gap-2">
					<Animated.View style={chevronStyle}>
						<Text
							className={clsx(
								"text-xs",
								isExpanded ? "text-purple-500" : "text-gray-400",
							)}
						>
							▶
						</Text>
					</Animated.View>
					<Text
						className={clsx(
							"text-sm uppercase tracking-wider font-bold",
							isExpanded ? "text-purple-400" : "text-gray-200",
						)}
					>
						{displayTitle}
					</Text>
					{itemCount !== undefined && (
						<View className="bg-gray-700 px-2 py-0.5 rounded-full ml-2">
							<Text className="text-gray-400 text-xs font-mono">
								{itemCount}
							</Text>
						</View>
					)}
				</View>
			</Pressable>

			{isExpanded && (
				<Animated.View
					entering={FadeIn.duration(200)}
					exiting={FadeOut.duration(200)}
					className="p-3 pt-0"
				>
					{children}
				</Animated.View>
			)}
		</Animated.View>
	);
}
