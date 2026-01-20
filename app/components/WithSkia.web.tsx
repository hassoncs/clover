import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

interface WithSkiaProps {
  getComponent: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export function WithSkia({
  getComponent,
  fallback = <ActivityIndicator color="white" style={styles.center} />,
}: WithSkiaProps) {
  return (
    <WithSkiaWeb
      getComponent={getComponent}
      fallback={fallback}
      opts={{
        locateFile: (file) => {
          if (typeof window !== "undefined") {
            const url = new URL(file, window.location.origin);
            return url.href;
          }
          return file;
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
