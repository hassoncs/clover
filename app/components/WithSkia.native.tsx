import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

interface WithSkiaProps {
  getComponent: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export function WithSkia({
  getComponent,
  fallback = <ActivityIndicator color="white" style={styles.center} />,
}: WithSkiaProps) {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    getComponent().then((mod) => {
      setComponent(() => mod.default);
    });
  }, [getComponent]);

  if (!Component) {
    return <>{fallback}</>;
  }

  return <Component />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
