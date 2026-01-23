import React, { useEffect, ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';

interface WithGodotProps {
  getComponent: () => Promise<{ default: ComponentType<unknown> }>;
  fallback?: React.ReactNode;
}

export function WithGodot({
  getComponent,
  fallback = <View style={styles.fallback} />,
}: WithGodotProps) {
  const [Component, setComponent] = React.useState<ComponentType<unknown> | null>(null);

  useEffect(() => {
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
  fallback: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
