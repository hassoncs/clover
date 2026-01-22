import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "./WithSkia";
import type { ComponentType } from "react";

interface SkiaExampleProps {
  title: string;
  getComponent: () => Promise<{ default: ComponentType<any> }>;
}

export function SkiaExample({ title, getComponent }: SkiaExampleProps) {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      <WithSkia getComponent={getComponent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
});
