import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ChatTextArea } from "@/components/create-game/ChatTextArea";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { EditorTab } from "./EditorProvider";

const TOOL_TABS: {
  id: EditorTab;
  icon: string;
  ionicon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { id: "gallery", icon: "🖼", ionicon: "images-outline", label: "Images" },
  { id: "assets", icon: "🎵", ionicon: "musical-notes-outline", label: "Sounds" },
  { id: "properties", icon: "⚙️", ionicon: "color-palette-outline", label: "Colors" },
  { id: "layers", icon: "🔧", ionicon: "options-outline", label: "Tweaks" },
  { id: "debug", icon: "🐛", ionicon: "bug-outline", label: "Debug" },
];

interface EditorToolbarProps {
  onSendMessage: (text: string) => void;
  onTabPress: (tabId: EditorTab) => void;
  isSending: boolean;
}

export function EditorToolbar({
  onSendMessage,
  onTabPress,
  isSending,
}: EditorToolbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <ChatTextArea
        onSend={onSendMessage}
        isSubmitting={isSending}
        variant="toolbar"
        enableSpeechToText
      />


      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScrollView}
      >
        {TOOL_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && styles.tabItemPressed,
            ]}
            onPress={() => onTabPress(tab.id)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={tab.ionicon} size={24} color="#9CA3AF" />
            </View>
            <Text style={styles.tabLabel}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  tabsScrollView: {
    flexGrow: 0,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 56,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  tabLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "500",
  },
});
