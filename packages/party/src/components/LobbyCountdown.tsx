import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn, ZoomOut } from "react-native-reanimated";

interface LobbyCountdownProps {
	onComplete: () => void;
}

export function LobbyCountdown({ onComplete }: LobbyCountdownProps) {
	const [count, setCount] = useState(3);
	const [showGo, setShowGo] = useState(false);

	useEffect(() => {
		if (count > 0) {
			const timer = setTimeout(() => setCount(count - 1), 1000);
			return () => clearTimeout(timer);
		} else if (!showGo) {
			setShowGo(true);
			const timer = setTimeout(() => {
				onComplete();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [count, showGo, onComplete]);

	return (
		<View
			style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
			className="items-center justify-center bg-theme-background/90"
		>
			<Animated.Text
				entering={FadeIn.duration(500)}
				className="text-theme-text-secondary text-2xl font-medium mb-8"
			>
				Gathering the fellowship...
			</Animated.Text>

			<View className="items-center justify-center h-40">
				{count > 0 ? (
					<Animated.Text
						key={count}
						entering={ZoomIn.springify()}
						exiting={ZoomOut.duration(200)}
						className="text-9xl font-black text-theme-primary"
					>
						{count}
					</Animated.Text>
				) : (
					<Animated.Text
						entering={ZoomIn.springify()}
						className="text-6xl font-black text-theme-primary text-center"
					>
						Let's Go!
					</Animated.Text>
				)}
			</View>
		</View>
	);
}
