import { useRef, useCallback } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Search...",
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleClear = useCallback(() => {
    onChangeText("");
    inputRef.current?.focus();
  }, [onChangeText]);

  const handleSubmitEditing = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && onSubmit) {
      onSubmit(trimmed);
    }
  }, [value, onSubmit]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#7B7F86" style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={handleSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="#7B7F86"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        blurOnSubmit={false}
        accessibilityLabel="Search"
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color="#7B7F86" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: "#17191F",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  icon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    color: "#F2F4F7",
    fontSize: 16,
    lineHeight: 20,
  },
  clearButton: {
    flexShrink: 0,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
