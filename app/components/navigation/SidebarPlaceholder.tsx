import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface SidebarPlaceholderProps {
  visible: boolean;
  onClose: () => void;
}

const PANEL_WIDTH = 280;

export function SidebarPlaceholder({ visible, onClose }: SidebarPlaceholderProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
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
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
        <Text style={styles.subtitle}>Sidebar scaffold ready. We can wire real nav items next.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  panel: {
    width: PANEL_WIDTH,
    height: "100%",
    backgroundColor: "#0D1015",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255,255,255,0.12)",
    paddingTop: 72,
    paddingHorizontal: 18,
    gap: 10,
  },
  title: {
    color: "#F4F4F5",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
  },
});
