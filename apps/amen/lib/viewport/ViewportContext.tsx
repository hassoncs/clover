import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type ViewProps, type LayoutChangeEvent } from 'react-native';
import {
  type ViewportContextValue,
  type ViewportSize,
  createViewportValue,
  DEFAULT_PIXELS_PER_METER,
} from './types';

export const ViewportContext = createContext<ViewportContextValue | null>(null);

export interface ViewportRootProps extends ViewProps {
  children: ReactNode;
  pixelsPerMeter?: number;
  onViewportChange?: (size: ViewportSize) => void;
}

export function ViewportRoot({
  children,
  pixelsPerMeter = DEFAULT_PIXELS_PER_METER,
  onViewportChange,
  onLayout: externalOnLayout,
  style,
  ...viewProps
}: ViewportRootProps) {
  const windowDimensions = useWindowDimensions();
  const [measuredSize, setMeasuredSize] = useState<ViewportSize>({ width: 0, height: 0 });

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      if (width !== measuredSize.width || height !== measuredSize.height) {
        const newSize = { width, height };
        setMeasuredSize(newSize);
        onViewportChange?.(newSize);
      }

      externalOnLayout?.(event);
    },
    [measuredSize.width, measuredSize.height, onViewportChange, externalOnLayout]
  );

  const effectiveSize = useMemo((): ViewportSize => {
    if (measuredSize.width > 0 && measuredSize.height > 0) {
      return measuredSize;
    }
    return { width: windowDimensions.width, height: windowDimensions.height };
  }, [measuredSize, windowDimensions.width, windowDimensions.height]);

  const viewportValue = useMemo(
    () => createViewportValue(effectiveSize, pixelsPerMeter),
    [effectiveSize, pixelsPerMeter]
  );

  return (
    <ViewportContext.Provider value={viewportValue}>
      <View style={[{ flex: 1 }, style]} onLayout={handleLayout} {...viewProps}>
        {children}
      </View>
    </ViewportContext.Provider>
  );
}
