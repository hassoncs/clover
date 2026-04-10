import { tokens } from "./tokens";
function cssVar(name) {
    return `var(--${name})`;
}
function themeColor(name) {
    return `rgb(var(--color-theme-${name}) / <alpha-value>)`;
}
export const tailwindPreset = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: {
                    ...tokens.colors.primary,
                    DEFAULT: tokens.semantic.colors.primary,
                },
                secondary: {
                    ...tokens.colors.secondary,
                    DEFAULT: tokens.semantic.colors.secondary,
                },
                white: tokens.colors.white,
                black: tokens.colors.black,
                transparent: tokens.colors.transparent,
                success: tokens.colors.success,
                warning: tokens.colors.warning,
                error: tokens.colors.error,
                info: tokens.colors.info,
                destructive: {
                    DEFAULT: tokens.colors.error,
                    foreground: tokens.colors.white,
                },
                muted: {
                    DEFAULT: tokens.colors.secondary[100],
                    foreground: tokens.colors.secondary[500],
                },
                accent: {
                    DEFAULT: tokens.colors.secondary[100],
                    foreground: tokens.colors.secondary[900],
                },
                popover: {
                    DEFAULT: tokens.colors.white,
                    foreground: tokens.colors.black,
                },
                card: { DEFAULT: tokens.colors.white, foreground: tokens.colors.black },
                input: tokens.semantic.colors.border,
                ring: tokens.semantic.colors.primary,
                surface: tokens.semantic.colors.surface,
                background: tokens.semantic.colors.background,
                border: tokens.semantic.colors.border,
                text: tokens.semantic.colors.text,
                theme: {
                    background: themeColor("background"),
                    surface: {
                        DEFAULT: themeColor("surface"),
                        elevated: themeColor("surface-elevated"),
                    },
                    border: themeColor("border"),
                    text: {
                        DEFAULT: themeColor("text"),
                        primary: themeColor("text"),
                        secondary: themeColor("text-secondary"),
                        tertiary: themeColor("text-tertiary"),
                        muted: themeColor("text-tertiary"),
                        inverse: themeColor("text-inverse"),
                    },
                    primary: themeColor("primary"),
                    secondary: themeColor("secondary"),
                    success: themeColor("success"),
                    warning: themeColor("warning"),
                    error: themeColor("error"),
                    danger: themeColor("error"),
                },
                amen: {
                    glow: `rgb(var(--amen-glow-gold) / <alpha-value>)`,
                    warmWhite: `rgb(var(--amen-warm-white) / <alpha-value>)`,
                    softYellow: `rgb(var(--amen-soft-yellow) / <alpha-value>)`,
                    golden: `rgb(var(--amen-golden-accent) / <alpha-value>)`,
                },
                // Editor IDE colors — backed by CSS custom properties for theme switching
                ed: {
                    bg: cssVar("ed-bg"),
                    surface: {
                        DEFAULT: cssVar("ed-surface"),
                        hover: cssVar("ed-surface-hover"),
                        active: cssVar("ed-surface-active"),
                    },
                    border: {
                        DEFAULT: cssVar("ed-border"),
                        strong: cssVar("ed-border-strong"),
                    },
                    text: {
                        DEFAULT: cssVar("ed-text"),
                        secondary: cssVar("ed-text-secondary"),
                        muted: cssVar("ed-text-muted"),
                    },
                    accent: {
                        DEFAULT: cssVar("ed-accent"),
                        hover: cssVar("ed-accent-hover"),
                        muted: cssVar("ed-accent-muted"),
                    },
                    success: cssVar("ed-success"),
                    warning: cssVar("ed-warning"),
                    error: cssVar("ed-error"),
                    activityBar: {
                        bg: cssVar("ed-activity-bar-bg"),
                        icon: cssVar("ed-activity-bar-icon"),
                        iconActive: cssVar("ed-activity-bar-icon-active"),
                        indicator: cssVar("ed-activity-bar-indicator"),
                    },
                    titleBar: { bg: cssVar("ed-titlebar-bg") },
                    tab: {
                        bg: cssVar("ed-tab-bg"),
                        activeBg: cssVar("ed-tab-active-bg"),
                        border: cssVar("ed-tab-border"),
                        text: cssVar("ed-tab-text"),
                        activeText: cssVar("ed-tab-active-text"),
                    },
                    panel: {
                        bg: cssVar("ed-panel-bg"),
                        headerBg: cssVar("ed-panel-header-bg"),
                    },
                    input: {
                        bg: cssVar("ed-input-bg"),
                        border: cssVar("ed-input-border"),
                        text: cssVar("ed-input-text"),
                        placeholder: cssVar("ed-input-placeholder"),
                    },
                },
                grainient: {
                    ultraviolet: {
                        surface: `rgb(var(--grainient-ultraviolet-surface) / <alpha-value>)`,
                        text: `rgb(var(--grainient-ultraviolet-text) / <alpha-value>)`,
                        border: `rgb(var(--grainient-ultraviolet-border) / <alpha-value>)`,
                    },
                    ember: {
                        surface: `rgb(var(--grainient-ember-surface) / <alpha-value>)`,
                        text: `rgb(var(--grainient-ember-text) / <alpha-value>)`,
                        border: `rgb(var(--grainient-ember-border) / <alpha-value>)`,
                    },
                    abyss: {
                        surface: `rgb(var(--grainient-abyss-surface) / <alpha-value>)`,
                        text: `rgb(var(--grainient-abyss-text) / <alpha-value>)`,
                        border: `rgb(var(--grainient-abyss-border) / <alpha-value>)`,
                    },
                    amen: {
                        surface: `rgb(var(--grainient-amen-surface) / <alpha-value>)`,
                        text: `rgb(var(--grainient-amen-text) / <alpha-value>)`,
                        border: `rgb(var(--grainient-amen-border) / <alpha-value>)`,
                    },
                    amenWarm: {
                        surface: `rgb(var(--grainient-amenWarm-surface) / <alpha-value>)`,
                        text: `rgb(var(--grainient-amenWarm-text) / <alpha-value>)`,
                        border: `rgb(var(--grainient-amenWarm-border) / <alpha-value>)`,
                    },
                    glass: {
                        DEFAULT: `rgb(var(--grainient-glass) / <alpha-value>)`,
                        hover: `rgb(var(--grainient-glass-hover) / <alpha-value>)`,
                        active: `rgb(var(--grainient-glass-active) / <alpha-value>)`,
                    },
                },
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
    plugins: [],
};
export default tailwindPreset;
//# sourceMappingURL=tailwind.js.map