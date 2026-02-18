import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Timer } from "./Timer";

type PhaseShellProps = {
	children: ReactNode;
	round?: number;
	totalRounds?: number;
	title?: string;
	subtitle?: string;
	timerSeconds?: number;
	accentColor?: string;
	isHost?: boolean;
};

export function PhaseShell({
	children,
	round,
	totalRounds,
	title,
	subtitle,
	timerSeconds,
	accentColor,
	isHost,
}: PhaseShellProps) {
	const size = isHost ? "large" : "normal";

	return (
		<Animated.View entering={FadeIn} className="flex-1 w-full items-center p-4">
			{(round || title || timerSeconds) && (
				<View className="w-full items-center mb-4 gap-2">
					{round != null && (
						<Text
							className={`font-bold text-theme-text-secondary ${isHost ? "text-xl" : "text-sm"}`}
						>
							Round {round}
							{totalRounds ? ` of ${totalRounds}` : ""}
						</Text>
					)}
					{title && (
						<Text
							className={`font-bold text-center ${isHost ? "text-4xl" : "text-2xl"}`}
							style={accentColor ? { color: accentColor } : undefined}
						>
							{!accentColor && <Text className="text-theme-text">{title}</Text>}
							{accentColor ? title : null}
						</Text>
					)}
					{subtitle && (
						<Text
							className={`text-theme-text-secondary text-center ${isHost ? "text-xl" : "text-sm"}`}
						>
							{subtitle}
						</Text>
					)}
					{timerSeconds != null && timerSeconds > 0 && (
						<Timer seconds={timerSeconds} size={size} />
					)}
				</View>
			)}
			{children}
		</Animated.View>
	);
}
