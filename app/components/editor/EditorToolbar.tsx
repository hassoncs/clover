import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
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
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >

      <View style={styles.composerRow}>
        <TextInput
          testID="editor-chat-input"
          style={styles.input}
          placeholder="Make an edit..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isSending}
          accessibilityLabel="Chat input"
        />
        <Pressable
          testID="editor-send-button"
          style={({ pressed }) => [
            styles.sendButton,
            pressed && styles.sendButtonPressed,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons
            name="arrow-forward-circle"
            size={40}
            color={!inputText.trim() || isSending ? "#4B5563" : "#FFFFFF"}
          />
        </Pressable>
      </View>


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
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#374151",
    height: 48,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
