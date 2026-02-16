import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { tokens } from "@slopcade/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	getEditorPreloadState,
	subscribeToEditorPreload,
} from "@/lib/editor/hooks/useEditorPreloader";

const ROUTE_ICON_MAP: Record<
	string,
	{
		active: keyof typeof Ionicons.glyphMap;
		inactive: keyof typeof Ionicons.glyphMap;
	}
> = {
	feed: { active: "flame", inactive: "flame-outline" },
	browse: { active: "compass", inactive: "compass-outline" },
	lab: { active: "flask", inactive: "flask-outline" },
	profile: { active: "person", inactive: "person-outline" },
};

interface FloatingTabBarProps extends BottomTabBarProps {
	onPrimaryPress?: () => void;
	isAuthenticated: boolean;
	isCreating?: boolean;
}

export function FloatingTabBar({
	state,
	descriptors,
	navigation,
	onPrimaryPress,
	isAuthenticated,
	isCreating = false,
}: FloatingTabBarProps) {
	const insets = useSafeAreaInsets();
	const [preloadState, setPreloadState] = useState(getEditorPreloadState);

	useEffect(() => {
		const unsubscribe = subscribeToEditorPreload(() => {
			setPreloadState(getEditorPreloadState());
		});
		return () => {
			unsubscribe();
		};
	}, []);

	const showPreloadProgress =
		!preloadState.isReady &&
		(preloadState.isPreloading || preloadState.progress > 0);

	return (
		<View
			style={[
				styles.container,
				{
					paddingBottom: Math.max(insets.bottom, 10) + 6,
					pointerEvents: "box-none",
				},
			]}
		>
			<View style={styles.row}>
				<View style={styles.tabPill}>
					{state.routes.map((route, index) => {
						const descriptor = descriptors[route.key];
						const isFocused = state.index === index;
						const icon = ROUTE_ICON_MAP[route.name];

						if (!icon) return null;

						const onPress = () => {
							const event = navigation.emit({
								type: "tabPress",
								target: route.key,
								canPreventDefault: true,
							});

							if (!isFocused && !event.defaultPrevented) {
								navigation.navigate(route.name);
							}
						};

						const onLongPress = () => {
							navigation.emit({
								type: "tabLongPress",
								target: route.key,
							});
						};

						return (
							<Pressable
								key={route.key}
								accessibilityRole="button"
								accessibilityState={isFocused ? { selected: true } : {}}
								accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
								testID={descriptor.options.tabBarButtonTestID}
								onPress={onPress}
								onLongPress={onLongPress}
								style={styles.tabButton}
							>
								<Ionicons
									name={isFocused ? icon.active : icon.inactive}
									size={26}
									color={
										isFocused
											? tokens.colors.text.inverse
											: tokens.colors.text.tertiary
									}
								/>
							</Pressable>
						);
					})}
				</View>

				{onPrimaryPress && (
					<View style={styles.primaryButtonWrapper}>
						{showPreloadProgress && (
							<View style={styles.progressRing}>
								<View
									style={[
										styles.progressArc,
										{
											transform: [
												{ rotate: `${(preloadState.progress / 100) * 360}deg` },
											],
										},
									]}
								/>
							</View>
						)}
						<Pressable
							style={[
								styles.primaryButton,
								isCreating && styles.primaryButtonLoading,
							]}
							onPress={onPrimaryPress}
							disabled={isCreating}
							accessibilityRole="button"
							accessibilityLabel={
								isCreating ? "Creating game..." : "Create new game"
							}
							accessibilityState={isCreating ? { busy: true } : {}}
						>
							{isCreating ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator
										size="small"
										color={tokens.colors.text.inverse}
									/>
								</View>
							) : (
								<Ionicons
									name="add"
									size={34}
									color={tokens.colors.text.tertiary}
								/>
							)}
						</Pressable>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	tabPill: {
		height: 68,
		minWidth: 278,
		borderRadius: 34,
		backgroundColor: tokens.colors.secondary[900],
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: tokens.colors.border,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		opacity: 0.96,
	},
	tabButton: {
		width: 54,
		height: 54,
		borderRadius: 27,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButton: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: tokens.colors.secondary[900],
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: tokens.colors.border,
		alignItems: "center",
		justifyContent: "center",
		opacity: 0.96,
	},
	primaryButtonLoading: {
		opacity: 0.7,
	},
	loadingContainer: {
		width: 34,
		height: 34,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonWrapper: {
		position: "relative",
	},
	progressRing: {
		position: "absolute",
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 2,
		borderColor: "rgba(99, 102, 241, 0.3)",
	},
	progressArc: {
		position: "absolute",
		top: -2,
		left: -2,
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 2,
		borderColor: tokens.colors.primary[500],
		borderLeftColor: "transparent",
		borderBottomColor: "transparent",
	},
});
