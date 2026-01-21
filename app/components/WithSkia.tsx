import React, { useEffect, ComponentType } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WithSkiaProps {
  getComponent: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export function WithSkia({
  getComponent,
  fallback = <View style={styles.fallback} />,
}: WithSkiaProps) {
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(null);
  const [SkiaWebComponent, setSkiaWebComponent] = React.useState<ComponentType<any> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, load WithSkiaWeb dynamically
      import('@shopify/react-native-skia/lib/module/web').then((mod) => {
        setSkiaWebComponent(() => mod.WithSkiaWeb);
      });
    } else {
      // On native, load the actual component directly
      getComponent().then((mod) => {
        setComponent(() => mod.default);
      });
    }
  }, [getComponent]);

  // On native, render directly without WithSkiaWeb wrapper
  if (Platform.OS !== 'web') {
    if (!Component) {
      return <>{fallback}</>;
    }
    return <Component />;
  }

  // On web, use WithSkiaWeb to load CanvasKit
  if (!SkiaWebComponent) {
    return <>{fallback}</>;
  }

  const WithSkiaWeb = SkiaWebComponent;

  return (
    <WithSkiaWeb
      getComponent={getComponent}
      fallback={fallback}
      opts={{
        locateFile: (file: string) => `/${file}`,
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
  },
});
