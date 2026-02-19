import { useEffect, useRef, useState } from "react";
import {
	Animated,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

const AMEN = {
	background: "#0D1C33",
	surface: "#152A4D",
	surfaceElevated: "#1E3866",
	border: "#2A4A80",
	text: "#FDF8F0",
	textSecondary: "#A89B7D",
	textTertiary: "#6B7280",
	primary: "#C9A84C",
	secondary: "#1B3A6B",
	black: "#000000",
};

interface SidebarPlaceholderProps {
	visible: boolean;
	onClose: () => void;
}

const PANEL_WIDTH = 280;

export function SidebarPlaceholder({
	visible,
	onClose,
}: SidebarPlaceholderProps) {
	const [mounted, setMounted] = useState(visible);
	const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

	useEffect(() => {
		if (visible) {
			setMounted(true);
		}

		Animated.timing(progress, {
			toValue: visible ? 1 : 0,
			duration: 220,
			useNativeDriver: Platform.OS !== "web",
		}).start(({ finished }) => {
			if (finished && !visible) {
				setMounted(false);
			}
		});
	}, [progress, visible]);

	if (!mounted) {
		return null;
	}

	const overlayOpacity = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 0.36],
	});

	const translateX = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [-PANEL_WIDTH, 0],
	});

	return (
		<View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
			<Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Close sidebar"
				/>
			</Animated.View>

			<Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
				<Text style={styles.title}>Menu</Text>
				<Text style={styles.subtitle}>
					Sidebar scaffold ready. We can wire real nav items next.
				</Text>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: AMEN.black,
	},
	panel: {
		width: PANEL_WIDTH,
		height: "100%",
		backgroundColor: AMEN.surface,
		borderRightWidth: StyleSheet.hairlineWidth,
		borderRightColor: AMEN.border,
		paddingTop: 72,
		paddingHorizontal: 18,
		gap: 10,
	},
	title: {
		color: AMEN.text,
		fontSize: 22,
		fontWeight: "700",
	},
	subtitle: {
		color: AMEN.textTertiary,
		fontSize: 14,
		lineHeight: 20,
	},
});
