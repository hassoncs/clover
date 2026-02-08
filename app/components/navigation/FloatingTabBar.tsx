import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROUTE_ICON_MAP: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  browse: { active: "home", inactive: "home-outline" },
  lab: { active: "flask", inactive: "flask-outline" },
  maker: { active: "color-palette", inactive: "color-palette-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

interface FloatingTabBarProps extends BottomTabBarProps {
  onPrimaryPress: () => void;
  isAuthenticated: boolean;
}

export function FloatingTabBar({ state, descriptors, navigation, onPrimaryPress, isAuthenticated }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]} pointerEvents="box-none">
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
                  color={isFocused ? "#FFFFFF" : "#A1A1AA"}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.primaryButton} onPress={onPrimaryPress} accessibilityRole="button">
          <Ionicons name="add" size={34} color="#D4D4D8" />
        </Pressable>
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
    backgroundColor: "rgba(28, 30, 36, 0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    backgroundColor: "rgba(28, 30, 36, 0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
