import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { tokens } from "@slopcade/theme";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROUTE_ICON_MAP: Record<
	string,
	{
		active: keyof typeof Ionicons.glyphMap;
		inactive: keyof typeof Ionicons.glyphMap;
	}
> = {
	browse: { active: "compass", inactive: "compass-outline" },
	profile: { active: "person", inactive: "person-outline" },
};

interface FloatingTabBarProps extends BottomTabBarProps {}

export function FloatingTabBar({
	state,
	descriptors,
	navigation,
}: FloatingTabBarProps) {
	const insets = useSafeAreaInsets();

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
});
