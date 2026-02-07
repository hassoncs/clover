import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppFrameHeaderProps {
  title: string;
  onMenuPress: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onInvitePress?: () => void;
}

function HeaderIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton} hitSlop={8}>
      <Ionicons name={icon} size={24} color="#F2F4F7" />
    </Pressable>
  );
}

export function AppFrameHeader({
  title,
  onMenuPress,
  onSearchPress,
  onNotificationsPress,
  onInvitePress,
}: AppFrameHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <View style={styles.sideRow}>
          <HeaderIconButton icon="menu" onPress={onMenuPress} />
          <HeaderIconButton icon="search" onPress={onSearchPress} />
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.sideRow, styles.rightRow]}>
          <HeaderIconButton icon="notifications-outline" onPress={onNotificationsPress} />
          <HeaderIconButton icon="person-add-outline" onPress={onInvitePress} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#050608",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 38,
  },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 96,
  },
  rightRow: {
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  title: {
    color: "#F4F4F5",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    flex: 1,
  },
});
