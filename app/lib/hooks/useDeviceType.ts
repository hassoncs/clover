import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const SCREEN_WIDTH_BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MAX: 1024,
} as const;

export function useDeviceType(): DeviceType {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    if (width < SCREEN_WIDTH_BREAKPOINTS.MOBILE_MAX) return 'mobile';
    if (width < SCREEN_WIDTH_BREAKPOINTS.TABLET_MAX) return 'tablet';
    return 'desktop';
  }, [width]);
}

export function useIsMobile(): boolean {
  const { width } = useWindowDimensions();
  return width < SCREEN_WIDTH_BREAKPOINTS.MOBILE_MAX;
}

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= SCREEN_WIDTH_BREAKPOINTS.MOBILE_MAX && width < SCREEN_WIDTH_BREAKPOINTS.TABLET_MAX;
}

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= SCREEN_WIDTH_BREAKPOINTS.TABLET_MAX;
}

export function useShouldShowSidebar(): boolean {
  return useIsDesktop();
}

export function useBreakpoint(): DeviceType {
  return useDeviceType();
}

export function useMinWidth(minWidth: number): boolean {
  const { width } = useWindowDimensions();
  return width >= minWidth;
}

export function useResponsiveValue<T>(values: { mobile: T; tablet: T; desktop: T }): T {
  const deviceType = useDeviceType();
  return values[deviceType];
}

export function useResponsiveStyles<T>(styles: { mobile: T; tablet?: T; desktop: T }): T {
  const deviceType = useDeviceType();

  if (deviceType === 'mobile') return styles.mobile;
  if (deviceType === 'tablet') return styles.tablet ?? styles.desktop;
  return styles.desktop;
}
