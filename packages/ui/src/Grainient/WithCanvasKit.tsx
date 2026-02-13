import type React from "react";
import { type ComponentType, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

interface WithCanvasKitProps {
	getComponent: () => Promise<{ default: ComponentType<any> }>;
	fallback?: React.ReactNode;
	fadeInDuration?: number;
}

export function WithCanvasKit({
	getComponent,
	fallback = <View style={styles.fallback} />,
	fadeInDuration = 2500,
}: WithCanvasKitProps) {
	const [Component, setComponent] = useState<ComponentType<any> | null>(null);
	const [SkiaWebComponent, setSkiaWebComponent] =
		useState<ComponentType<any> | null>(null);

	useEffect(() => {
		if (Platform.OS === "web") {
			import("@shopify/react-native-skia/lib/module/web").then((mod) => {
				setSkiaWebComponent(() => mod.WithSkiaWeb);
			});
		} else {
			getComponent().then((mod) => {
				setComponent(() => mod.default);
			});
		}
	}, [getComponent]);

	if (Platform.OS !== "web") {
		if (!Component) {
			return fallback;
		}
		return <Component />;
	}

	return (
		<WebFadeIn fadeInDuration={fadeInDuration}>
			{SkiaWebComponent ? (
				<SkiaWebComponent
					getComponent={async () => {
						const component = await getComponent();
						return component;
					}}
					fallback={fallback}
					opts={{
						locateFile: (file: string) => `/${file}`,
					}}
				/>
			) : (
				fallback
			)}
		</WebFadeIn>
	);
}

function WebFadeIn({
	fadeInDuration,
	children,
}: {
	fadeInDuration: number;
	children: React.ReactNode;
}) {
	const opacity = useSharedValue(fadeInDuration > 0 ? 0 : 1);

	useEffect(() => {
		if (fadeInDuration > 0) {
			opacity.value = withTiming(1, { duration: fadeInDuration });
		}
	}, [fadeInDuration, opacity]);

	const animatedStyle = useAnimatedStyle(
		() => ({
			opacity: opacity.value,
		}),
		[],
	);

	return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
	fallback: {
		flex: 1,
	},
});
