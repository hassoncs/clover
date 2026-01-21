import { tokens } from './tokens';

// Tailwind CSS preset from design tokens
// used by NativeWind in React Native apps and web Tailwind config

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        white: tokens.colors.white,
        black: tokens.colors.black,
        transparent: tokens.colors.transparent,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
        surface: tokens.semantic.colors.surface,
        background: tokens.semantic.colors.background,
        border: tokens.semantic.colors.border,
        text: tokens.semantic.colors.text,
      },
      spacing: tokens.spacing,
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize,
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
      transitionDuration: tokens.motion.duration,
      transitionTimingFunction: tokens.motion.easing,
      zIndex: tokens.zIndex,
      screens: tokens.breakpoints,
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
} as const;

export default tailwindPreset;