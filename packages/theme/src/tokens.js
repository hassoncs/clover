// Design Tokens - Platform Agnostic
// Exported as constants for consumption by NativeWind, CSS, and any UI framework
export const colors = {
    // Primary brand colors
    primary: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0ea5e9",
        600: "#0284c7",
        700: "#0369a1",
        800: "#075985",
        900: "#0c4a6e",
    },
    // Secondary colors
    secondary: {
        50: "#f8fafc",
        100: "#f1f5f9",
        200: "#e2e8f0",
        300: "#cbd5e1",
        400: "#94a3b8",
        500: "#64748b",
        600: "#475569",
        700: "#334155",
        800: "#1e293b",
        900: "#0f172a",
    },
    // Semantic colors
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",
    // Status colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    // Surface colors
    surface: "#ffffff",
    background: "#ffffff",
    border: "#e5e7eb",
    // Text colors
    text: {
        primary: "#111827",
        secondary: "#6b7280",
        tertiary: "#9ca3af",
        inverse: "#ffffff",
    },
};
// --------------------------------------------------------------------------
// Editor / IDE semantic color themes (GitHub Primer-inspired)
// --------------------------------------------------------------------------
export const editorThemes = {
    dark: {
        bg: "#0d1117",
        surface: "#161b22",
        surfaceHover: "#1c2128",
        surfaceActive: "#282e33",
        border: "#30363d",
        borderStrong: "#484f58",
        text: "#e6edf3",
        textSecondary: "#8b949e",
        textMuted: "#484f58",
        accent: "#6366f1",
        accentHover: "#818cf8",
        accentMuted: "rgba(99,102,241,0.15)",
        success: "#3fb950",
        warning: "#d29922",
        error: "#f85149",
        // Editor chrome
        activityBarBg: "#0d1117",
        activityBarIcon: "#8b949e",
        activityBarIconActive: "#e6edf3",
        activityBarIndicator: "#6366f1",
        titleBarBg: "#0d1117",
        tabBg: "transparent",
        tabActiveBg: "#161b22",
        tabBorder: "#30363d",
        tabText: "#8b949e",
        tabActiveText: "#e6edf3",
        panelBg: "#161b22",
        panelHeaderBg: "#0d1117",
        inputBg: "#0d1117",
        inputBorder: "#30363d",
        inputText: "#e6edf3",
        inputPlaceholder: "#484f58",
        scrollbarThumb: "#484f58",
        scrollbarTrack: "transparent",
    },
    light: {
        bg: "#ffffff",
        surface: "#f6f8fa",
        surfaceHover: "#eaeef2",
        surfaceActive: "#d0d7de",
        border: "#d0d7de",
        borderStrong: "#afb8c1",
        text: "#1f2328",
        textSecondary: "#656d76",
        textMuted: "#8b949e",
        accent: "#6366f1",
        accentHover: "#4f46e5",
        accentMuted: "rgba(99,102,241,0.1)",
        success: "#1a7f37",
        warning: "#9a6700",
        error: "#cf222e",
        // Editor chrome
        activityBarBg: "#f6f8fa",
        activityBarIcon: "#656d76",
        activityBarIconActive: "#1f2328",
        activityBarIndicator: "#6366f1",
        titleBarBg: "#f6f8fa",
        tabBg: "transparent",
        tabActiveBg: "#ffffff",
        tabBorder: "#d0d7de",
        tabText: "#656d76",
        tabActiveText: "#1f2328",
        panelBg: "#f6f8fa",
        panelHeaderBg: "#f6f8fa",
        inputBg: "#ffffff",
        inputBorder: "#d0d7de",
        inputText: "#1f2328",
        inputPlaceholder: "#8b949e",
        scrollbarThumb: "#afb8c1",
        scrollbarTrack: "transparent",
    },
};
// --------------------------------------------------------------------------
// Grainient Design System
// --------------------------------------------------------------------------
export const grainient = {
    palettes: {
        ultraviolet: {
            gradient: ["#7B2FBE", "#E040A0", "#4060FF", "#A855F7"],
            surface: {
                dark: "rgba(123, 47, 190, 0.15)",
                light: "rgba(123, 47, 190, 0.08)",
            },
            text: {
                dark: "#E040A0",
                light: "#7B2FBE",
            },
            border: {
                dark: "rgba(224, 64, 160, 0.3)",
                light: "rgba(123, 47, 190, 0.2)",
            },
        },
        ember: {
            gradient: ["#FF6B35", "#F72585", "#FFB627", "#FF006E"],
            surface: {
                dark: "rgba(255, 107, 53, 0.15)",
                light: "rgba(255, 107, 53, 0.08)",
            },
            text: {
                dark: "#FFB627",
                light: "#FF6B35",
            },
            border: {
                dark: "rgba(255, 182, 39, 0.3)",
                light: "rgba(255, 107, 53, 0.2)",
            },
        },
        abyss: {
            gradient: ["#0077B6", "#00B4D8", "#023E8A", "#48CAE4"],
            surface: {
                dark: "rgba(0, 119, 182, 0.15)",
                light: "rgba(0, 119, 182, 0.08)",
            },
            text: {
                dark: "#48CAE4",
                light: "#0077B6",
            },
            border: {
                dark: "rgba(72, 202, 228, 0.3)",
                light: "rgba(0, 119, 182, 0.2)",
            },
        },
        amen: {
            gradient: ["#FFD700", "#FFF1BA", "#C9A84C", "#FFFDF7"],
            surface: {
                dark: "rgba(201, 168, 76, 0.15)",
                light: "rgba(255, 215, 0, 0.08)",
            },
            text: {
                dark: "#FFD700",
                light: "#C9A84C",
            },
            border: {
                dark: "rgba(255, 215, 0, 0.3)",
                light: "rgba(201, 168, 76, 0.2)",
            },
        },
        amenWarm: {
            gradient: ["#FFF8E1", "#FFE082", "#FFD54F", "#FFC107"],
            surface: {
                dark: "rgba(255, 224, 130, 0.12)",
                light: "rgba(255, 193, 7, 0.06)",
            },
            text: {
                dark: "#FFE082",
                light: "#F57F17",
            },
            border: {
                dark: "rgba(255, 224, 130, 0.25)",
                light: "rgba(245, 127, 23, 0.15)",
            },
        },
    },
    grain: {
        frequency: 0.65,
        octaves: 4,
        opacity: 0.1,
        blendMode: "overlay",
    },
    surfaces: {
        dark: {
            glass: "rgba(22, 27, 34, 0.8)",
            glassHover: "rgba(28, 33, 40, 0.85)",
            glassActive: "rgba(40, 46, 51, 0.9)",
        },
        light: {
            glass: "rgba(255, 255, 255, 0.7)",
            glassHover: "rgba(246, 248, 250, 0.8)",
            glassActive: "rgba(234, 238, 242, 0.85)",
        },
    },
};
export const spacing = {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
    32: "128px",
    40: "160px",
    48: "192px",
    56: "224px",
    64: "256px",
};
export const typography = {
    fontFamily: {
        sans: [
            "Inter",
            "system-ui",
            "-apple-system",
            "BlinkMacSystemFont",
            "Segoe UI",
            "Roboto",
            "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
    },
    fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "36px",
        "5xl": "48px",
        "6xl": "60px",
    },
    fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
    },
    lineHeight: {
        tight: "1.25",
        normal: "1.5",
        relaxed: "1.75",
    },
};
export const radii = {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px",
};
export const shadows = {
    none: "none",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
};
export const motion = {
    duration: {
        fast: "150ms",
        normal: "300ms",
        slow: "500ms",
    },
    easing: {
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        easeOut: "cubic-bezier(0, 0, 0.2, 1)",
        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
};
export const zIndex = {
    base: "0",
    overlay: "10",
    modal: "20",
    popover: "30",
    tooltip: "40",
};
export const breakpoints = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
};
// Semantic mappings for easier usage
export const semantic = {
    colors: {
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        text: {
            primary: colors.text.primary,
            secondary: colors.text.secondary,
            tertiary: colors.text.tertiary,
            inverse: colors.text.inverse,
        },
        primary: colors.primary[500],
        secondary: colors.secondary[500],
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
    },
    spacing,
    radii,
    shadows,
    typography,
    motion,
};
export const tokens = {
    colors,
    editorThemes,
    grainient,
    spacing,
    typography,
    radii,
    shadows,
    motion,
    zIndex,
    breakpoints,
    semantic,
};
//# sourceMappingURL=tokens.js.map