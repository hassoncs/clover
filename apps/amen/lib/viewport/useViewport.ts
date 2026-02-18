import { useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { ViewportContext } from './ViewportContext';
import { type ViewportValue, createViewportValue, DEFAULT_PIXELS_PER_METER } from './types';

export function useViewport(): ViewportValue {
  const contextValue = useContext(ViewportContext);

  const windowDimensions = useWindowDimensions();

  if (contextValue) {
    return contextValue;
  }

  return createViewportValue(
    { width: windowDimensions.width, height: windowDimensions.height },
    DEFAULT_PIXELS_PER_METER
  );
}
