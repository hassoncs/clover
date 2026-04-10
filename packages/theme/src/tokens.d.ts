export declare const colors: {
    readonly primary: {
        readonly 50: "#f0f9ff";
        readonly 100: "#e0f2fe";
        readonly 200: "#bae6fd";
        readonly 300: "#7dd3fc";
        readonly 400: "#38bdf8";
        readonly 500: "#0ea5e9";
        readonly 600: "#0284c7";
        readonly 700: "#0369a1";
        readonly 800: "#075985";
        readonly 900: "#0c4a6e";
    };
    readonly secondary: {
        readonly 50: "#f8fafc";
        readonly 100: "#f1f5f9";
        readonly 200: "#e2e8f0";
        readonly 300: "#cbd5e1";
        readonly 400: "#94a3b8";
        readonly 500: "#64748b";
        readonly 600: "#475569";
        readonly 700: "#334155";
        readonly 800: "#1e293b";
        readonly 900: "#0f172a";
    };
    readonly white: "#ffffff";
    readonly black: "#000000";
    readonly transparent: "transparent";
    readonly success: "#10b981";
    readonly warning: "#f59e0b";
    readonly error: "#ef4444";
    readonly info: "#3b82f6";
    readonly surface: "#ffffff";
    readonly background: "#ffffff";
    readonly border: "#e5e7eb";
    readonly text: {
        readonly primary: "#111827";
        readonly secondary: "#6b7280";
        readonly tertiary: "#9ca3af";
        readonly inverse: "#ffffff";
    };
};
export declare const editorThemes: {
    readonly dark: {
        readonly bg: "#0d1117";
        readonly surface: "#161b22";
        readonly surfaceHover: "#1c2128";
        readonly surfaceActive: "#282e33";
        readonly border: "#30363d";
        readonly borderStrong: "#484f58";
        readonly text: "#e6edf3";
        readonly textSecondary: "#8b949e";
        readonly textMuted: "#484f58";
        readonly accent: "#6366f1";
        readonly accentHover: "#818cf8";
        readonly accentMuted: "rgba(99,102,241,0.15)";
        readonly success: "#3fb950";
        readonly warning: "#d29922";
        readonly error: "#f85149";
        readonly activityBarBg: "#0d1117";
        readonly activityBarIcon: "#8b949e";
        readonly activityBarIconActive: "#e6edf3";
        readonly activityBarIndicator: "#6366f1";
        readonly titleBarBg: "#0d1117";
        readonly tabBg: "transparent";
        readonly tabActiveBg: "#161b22";
        readonly tabBorder: "#30363d";
        readonly tabText: "#8b949e";
        readonly tabActiveText: "#e6edf3";
        readonly panelBg: "#161b22";
        readonly panelHeaderBg: "#0d1117";
        readonly inputBg: "#0d1117";
        readonly inputBorder: "#30363d";
        readonly inputText: "#e6edf3";
        readonly inputPlaceholder: "#484f58";
        readonly scrollbarThumb: "#484f58";
        readonly scrollbarTrack: "transparent";
    };
    readonly light: {
        readonly bg: "#ffffff";
        readonly surface: "#f6f8fa";
        readonly surfaceHover: "#eaeef2";
        readonly surfaceActive: "#d0d7de";
        readonly border: "#d0d7de";
        readonly borderStrong: "#afb8c1";
        readonly text: "#1f2328";
        readonly textSecondary: "#656d76";
        readonly textMuted: "#8b949e";
        readonly accent: "#6366f1";
        readonly accentHover: "#4f46e5";
        readonly accentMuted: "rgba(99,102,241,0.1)";
        readonly success: "#1a7f37";
        readonly warning: "#9a6700";
        readonly error: "#cf222e";
        readonly activityBarBg: "#f6f8fa";
        readonly activityBarIcon: "#656d76";
        readonly activityBarIconActive: "#1f2328";
        readonly activityBarIndicator: "#6366f1";
        readonly titleBarBg: "#f6f8fa";
        readonly tabBg: "transparent";
        readonly tabActiveBg: "#ffffff";
        readonly tabBorder: "#d0d7de";
        readonly tabText: "#656d76";
        readonly tabActiveText: "#1f2328";
        readonly panelBg: "#f6f8fa";
        readonly panelHeaderBg: "#f6f8fa";
        readonly inputBg: "#ffffff";
        readonly inputBorder: "#d0d7de";
        readonly inputText: "#1f2328";
        readonly inputPlaceholder: "#8b949e";
        readonly scrollbarThumb: "#afb8c1";
        readonly scrollbarTrack: "transparent";
    };
};
export declare const grainient: {
    readonly palettes: {
        readonly ultraviolet: {
            readonly gradient: readonly ["#7B2FBE", "#E040A0", "#4060FF", "#A855F7"];
            readonly surface: {
                readonly dark: "rgba(123, 47, 190, 0.15)";
                readonly light: "rgba(123, 47, 190, 0.08)";
            };
            readonly text: {
                readonly dark: "#E040A0";
                readonly light: "#7B2FBE";
            };
            readonly border: {
                readonly dark: "rgba(224, 64, 160, 0.3)";
                readonly light: "rgba(123, 47, 190, 0.2)";
            };
        };
        readonly ember: {
            readonly gradient: readonly ["#FF6B35", "#F72585", "#FFB627", "#FF006E"];
            readonly surface: {
                readonly dark: "rgba(255, 107, 53, 0.15)";
                readonly light: "rgba(255, 107, 53, 0.08)";
            };
            readonly text: {
                readonly dark: "#FFB627";
                readonly light: "#FF6B35";
            };
            readonly border: {
                readonly dark: "rgba(255, 182, 39, 0.3)";
                readonly light: "rgba(255, 107, 53, 0.2)";
            };
        };
        readonly abyss: {
            readonly gradient: readonly ["#0077B6", "#00B4D8", "#023E8A", "#48CAE4"];
            readonly surface: {
                readonly dark: "rgba(0, 119, 182, 0.15)";
                readonly light: "rgba(0, 119, 182, 0.08)";
            };
            readonly text: {
                readonly dark: "#48CAE4";
                readonly light: "#0077B6";
            };
            readonly border: {
                readonly dark: "rgba(72, 202, 228, 0.3)";
                readonly light: "rgba(0, 119, 182, 0.2)";
            };
        };
        readonly amen: {
            readonly gradient: readonly ["#FFD700", "#FFF1BA", "#C9A84C", "#FFFDF7"];
            readonly surface: {
                readonly dark: "rgba(201, 168, 76, 0.15)";
                readonly light: "rgba(255, 215, 0, 0.08)";
            };
            readonly text: {
                readonly dark: "#FFD700";
                readonly light: "#C9A84C";
            };
            readonly border: {
                readonly dark: "rgba(255, 215, 0, 0.3)";
                readonly light: "rgba(201, 168, 76, 0.2)";
            };
        };
        readonly amenWarm: {
            readonly gradient: readonly ["#FFF8E1", "#FFE082", "#FFD54F", "#FFC107"];
            readonly surface: {
                readonly dark: "rgba(255, 224, 130, 0.12)";
                readonly light: "rgba(255, 193, 7, 0.06)";
            };
            readonly text: {
                readonly dark: "#FFE082";
                readonly light: "#F57F17";
            };
            readonly border: {
                readonly dark: "rgba(255, 224, 130, 0.25)";
                readonly light: "rgba(245, 127, 23, 0.15)";
            };
        };
    };
    readonly grain: {
        readonly frequency: 0.65;
        readonly octaves: 4;
        readonly opacity: 0.1;
        readonly blendMode: "overlay";
    };
    readonly surfaces: {
        readonly dark: {
            readonly glass: "rgba(22, 27, 34, 0.8)";
            readonly glassHover: "rgba(28, 33, 40, 0.85)";
            readonly glassActive: "rgba(40, 46, 51, 0.9)";
        };
        readonly light: {
            readonly glass: "rgba(255, 255, 255, 0.7)";
            readonly glassHover: "rgba(246, 248, 250, 0.8)";
            readonly glassActive: "rgba(234, 238, 242, 0.85)";
        };
    };
};
export type EditorThemeColors = {
    [K in keyof typeof editorThemes.dark]: string;
};
export type EditorThemeName = keyof typeof editorThemes;
export declare const spacing: {
    readonly 0: "0px";
    readonly 1: "4px";
    readonly 2: "8px";
    readonly 3: "12px";
    readonly 4: "16px";
    readonly 5: "20px";
    readonly 6: "24px";
    readonly 8: "32px";
    readonly 10: "40px";
    readonly 12: "48px";
    readonly 16: "64px";
    readonly 20: "80px";
    readonly 24: "96px";
    readonly 32: "128px";
    readonly 40: "160px";
    readonly 48: "192px";
    readonly 56: "224px";
    readonly 64: "256px";
};
export declare const typography: {
    readonly fontFamily: {
        readonly sans: readonly ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"];
        readonly mono: readonly ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"];
    };
    readonly fontSize: {
        readonly xs: "12px";
        readonly sm: "14px";
        readonly base: "16px";
        readonly lg: "18px";
        readonly xl: "20px";
        readonly "2xl": "24px";
        readonly "3xl": "30px";
        readonly "4xl": "36px";
        readonly "5xl": "48px";
        readonly "6xl": "60px";
    };
    readonly fontWeight: {
        readonly light: "300";
        readonly normal: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
    };
    readonly lineHeight: {
        readonly tight: "1.25";
        readonly normal: "1.5";
        readonly relaxed: "1.75";
    };
};
export declare const radii: {
    readonly none: "0px";
    readonly sm: "4px";
    readonly md: "8px";
    readonly lg: "12px";
    readonly xl: "16px";
    readonly "2xl": "24px";
    readonly full: "9999px";
};
export declare const shadows: {
    readonly none: "none";
    readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
    readonly base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
    readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
    readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
    readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
};
export declare const motion: {
    readonly duration: {
        readonly fast: "150ms";
        readonly normal: "300ms";
        readonly slow: "500ms";
    };
    readonly easing: {
        readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
        readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
        readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
        readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
    };
};
export declare const zIndex: {
    readonly base: "0";
    readonly overlay: "10";
    readonly modal: "20";
    readonly popover: "30";
    readonly tooltip: "40";
};
export declare const breakpoints: {
    readonly sm: "640px";
    readonly md: "768px";
    readonly lg: "1024px";
    readonly xl: "1280px";
    readonly "2xl": "1536px";
};
export declare const semantic: {
    readonly colors: {
        readonly background: "#ffffff";
        readonly surface: "#ffffff";
        readonly border: "#e5e7eb";
        readonly text: {
            readonly primary: "#111827";
            readonly secondary: "#6b7280";
            readonly tertiary: "#9ca3af";
            readonly inverse: "#ffffff";
        };
        readonly primary: "#0ea5e9";
        readonly secondary: "#64748b";
        readonly success: "#10b981";
        readonly warning: "#f59e0b";
        readonly error: "#ef4444";
        readonly info: "#3b82f6";
    };
    readonly spacing: {
        readonly 0: "0px";
        readonly 1: "4px";
        readonly 2: "8px";
        readonly 3: "12px";
        readonly 4: "16px";
        readonly 5: "20px";
        readonly 6: "24px";
        readonly 8: "32px";
        readonly 10: "40px";
        readonly 12: "48px";
        readonly 16: "64px";
        readonly 20: "80px";
        readonly 24: "96px";
        readonly 32: "128px";
        readonly 40: "160px";
        readonly 48: "192px";
        readonly 56: "224px";
        readonly 64: "256px";
    };
    readonly radii: {
        readonly none: "0px";
        readonly sm: "4px";
        readonly md: "8px";
        readonly lg: "12px";
        readonly xl: "16px";
        readonly "2xl": "24px";
        readonly full: "9999px";
    };
    readonly shadows: {
        readonly none: "none";
        readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        readonly base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
        readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
        readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
    };
    readonly typography: {
        readonly fontFamily: {
            readonly sans: readonly ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"];
            readonly mono: readonly ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"];
        };
        readonly fontSize: {
            readonly xs: "12px";
            readonly sm: "14px";
            readonly base: "16px";
            readonly lg: "18px";
            readonly xl: "20px";
            readonly "2xl": "24px";
            readonly "3xl": "30px";
            readonly "4xl": "36px";
            readonly "5xl": "48px";
            readonly "6xl": "60px";
        };
        readonly fontWeight: {
            readonly light: "300";
            readonly normal: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
        readonly lineHeight: {
            readonly tight: "1.25";
            readonly normal: "1.5";
            readonly relaxed: "1.75";
        };
    };
    readonly motion: {
        readonly duration: {
            readonly fast: "150ms";
            readonly normal: "300ms";
            readonly slow: "500ms";
        };
        readonly easing: {
            readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
            readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
            readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
        };
    };
};
export declare const tokens: {
    readonly colors: {
        readonly primary: {
            readonly 50: "#f0f9ff";
            readonly 100: "#e0f2fe";
            readonly 200: "#bae6fd";
            readonly 300: "#7dd3fc";
            readonly 400: "#38bdf8";
            readonly 500: "#0ea5e9";
            readonly 600: "#0284c7";
            readonly 700: "#0369a1";
            readonly 800: "#075985";
            readonly 900: "#0c4a6e";
        };
        readonly secondary: {
            readonly 50: "#f8fafc";
            readonly 100: "#f1f5f9";
            readonly 200: "#e2e8f0";
            readonly 300: "#cbd5e1";
            readonly 400: "#94a3b8";
            readonly 500: "#64748b";
            readonly 600: "#475569";
            readonly 700: "#334155";
            readonly 800: "#1e293b";
            readonly 900: "#0f172a";
        };
        readonly white: "#ffffff";
        readonly black: "#000000";
        readonly transparent: "transparent";
        readonly success: "#10b981";
        readonly warning: "#f59e0b";
        readonly error: "#ef4444";
        readonly info: "#3b82f6";
        readonly surface: "#ffffff";
        readonly background: "#ffffff";
        readonly border: "#e5e7eb";
        readonly text: {
            readonly primary: "#111827";
            readonly secondary: "#6b7280";
            readonly tertiary: "#9ca3af";
            readonly inverse: "#ffffff";
        };
    };
    readonly editorThemes: {
        readonly dark: {
            readonly bg: "#0d1117";
            readonly surface: "#161b22";
            readonly surfaceHover: "#1c2128";
            readonly surfaceActive: "#282e33";
            readonly border: "#30363d";
            readonly borderStrong: "#484f58";
            readonly text: "#e6edf3";
            readonly textSecondary: "#8b949e";
            readonly textMuted: "#484f58";
            readonly accent: "#6366f1";
            readonly accentHover: "#818cf8";
            readonly accentMuted: "rgba(99,102,241,0.15)";
            readonly success: "#3fb950";
            readonly warning: "#d29922";
            readonly error: "#f85149";
            readonly activityBarBg: "#0d1117";
            readonly activityBarIcon: "#8b949e";
            readonly activityBarIconActive: "#e6edf3";
            readonly activityBarIndicator: "#6366f1";
            readonly titleBarBg: "#0d1117";
            readonly tabBg: "transparent";
            readonly tabActiveBg: "#161b22";
            readonly tabBorder: "#30363d";
            readonly tabText: "#8b949e";
            readonly tabActiveText: "#e6edf3";
            readonly panelBg: "#161b22";
            readonly panelHeaderBg: "#0d1117";
            readonly inputBg: "#0d1117";
            readonly inputBorder: "#30363d";
            readonly inputText: "#e6edf3";
            readonly inputPlaceholder: "#484f58";
            readonly scrollbarThumb: "#484f58";
            readonly scrollbarTrack: "transparent";
        };
        readonly light: {
            readonly bg: "#ffffff";
            readonly surface: "#f6f8fa";
            readonly surfaceHover: "#eaeef2";
            readonly surfaceActive: "#d0d7de";
            readonly border: "#d0d7de";
            readonly borderStrong: "#afb8c1";
            readonly text: "#1f2328";
            readonly textSecondary: "#656d76";
            readonly textMuted: "#8b949e";
            readonly accent: "#6366f1";
            readonly accentHover: "#4f46e5";
            readonly accentMuted: "rgba(99,102,241,0.1)";
            readonly success: "#1a7f37";
            readonly warning: "#9a6700";
            readonly error: "#cf222e";
            readonly activityBarBg: "#f6f8fa";
            readonly activityBarIcon: "#656d76";
            readonly activityBarIconActive: "#1f2328";
            readonly activityBarIndicator: "#6366f1";
            readonly titleBarBg: "#f6f8fa";
            readonly tabBg: "transparent";
            readonly tabActiveBg: "#ffffff";
            readonly tabBorder: "#d0d7de";
            readonly tabText: "#656d76";
            readonly tabActiveText: "#1f2328";
            readonly panelBg: "#f6f8fa";
            readonly panelHeaderBg: "#f6f8fa";
            readonly inputBg: "#ffffff";
            readonly inputBorder: "#d0d7de";
            readonly inputText: "#1f2328";
            readonly inputPlaceholder: "#8b949e";
            readonly scrollbarThumb: "#afb8c1";
            readonly scrollbarTrack: "transparent";
        };
    };
    readonly grainient: {
        readonly palettes: {
            readonly ultraviolet: {
                readonly gradient: readonly ["#7B2FBE", "#E040A0", "#4060FF", "#A855F7"];
                readonly surface: {
                    readonly dark: "rgba(123, 47, 190, 0.15)";
                    readonly light: "rgba(123, 47, 190, 0.08)";
                };
                readonly text: {
                    readonly dark: "#E040A0";
                    readonly light: "#7B2FBE";
                };
                readonly border: {
                    readonly dark: "rgba(224, 64, 160, 0.3)";
                    readonly light: "rgba(123, 47, 190, 0.2)";
                };
            };
            readonly ember: {
                readonly gradient: readonly ["#FF6B35", "#F72585", "#FFB627", "#FF006E"];
                readonly surface: {
                    readonly dark: "rgba(255, 107, 53, 0.15)";
                    readonly light: "rgba(255, 107, 53, 0.08)";
                };
                readonly text: {
                    readonly dark: "#FFB627";
                    readonly light: "#FF6B35";
                };
                readonly border: {
                    readonly dark: "rgba(255, 182, 39, 0.3)";
                    readonly light: "rgba(255, 107, 53, 0.2)";
                };
            };
            readonly abyss: {
                readonly gradient: readonly ["#0077B6", "#00B4D8", "#023E8A", "#48CAE4"];
                readonly surface: {
                    readonly dark: "rgba(0, 119, 182, 0.15)";
                    readonly light: "rgba(0, 119, 182, 0.08)";
                };
                readonly text: {
                    readonly dark: "#48CAE4";
                    readonly light: "#0077B6";
                };
                readonly border: {
                    readonly dark: "rgba(72, 202, 228, 0.3)";
                    readonly light: "rgba(0, 119, 182, 0.2)";
                };
            };
            readonly amen: {
                readonly gradient: readonly ["#FFD700", "#FFF1BA", "#C9A84C", "#FFFDF7"];
                readonly surface: {
                    readonly dark: "rgba(201, 168, 76, 0.15)";
                    readonly light: "rgba(255, 215, 0, 0.08)";
                };
                readonly text: {
                    readonly dark: "#FFD700";
                    readonly light: "#C9A84C";
                };
                readonly border: {
                    readonly dark: "rgba(255, 215, 0, 0.3)";
                    readonly light: "rgba(201, 168, 76, 0.2)";
                };
            };
            readonly amenWarm: {
                readonly gradient: readonly ["#FFF8E1", "#FFE082", "#FFD54F", "#FFC107"];
                readonly surface: {
                    readonly dark: "rgba(255, 224, 130, 0.12)";
                    readonly light: "rgba(255, 193, 7, 0.06)";
                };
                readonly text: {
                    readonly dark: "#FFE082";
                    readonly light: "#F57F17";
                };
                readonly border: {
                    readonly dark: "rgba(255, 224, 130, 0.25)";
                    readonly light: "rgba(245, 127, 23, 0.15)";
                };
            };
        };
        readonly grain: {
            readonly frequency: 0.65;
            readonly octaves: 4;
            readonly opacity: 0.1;
            readonly blendMode: "overlay";
        };
        readonly surfaces: {
            readonly dark: {
                readonly glass: "rgba(22, 27, 34, 0.8)";
                readonly glassHover: "rgba(28, 33, 40, 0.85)";
                readonly glassActive: "rgba(40, 46, 51, 0.9)";
            };
            readonly light: {
                readonly glass: "rgba(255, 255, 255, 0.7)";
                readonly glassHover: "rgba(246, 248, 250, 0.8)";
                readonly glassActive: "rgba(234, 238, 242, 0.85)";
            };
        };
    };
    readonly spacing: {
        readonly 0: "0px";
        readonly 1: "4px";
        readonly 2: "8px";
        readonly 3: "12px";
        readonly 4: "16px";
        readonly 5: "20px";
        readonly 6: "24px";
        readonly 8: "32px";
        readonly 10: "40px";
        readonly 12: "48px";
        readonly 16: "64px";
        readonly 20: "80px";
        readonly 24: "96px";
        readonly 32: "128px";
        readonly 40: "160px";
        readonly 48: "192px";
        readonly 56: "224px";
        readonly 64: "256px";
    };
    readonly typography: {
        readonly fontFamily: {
            readonly sans: readonly ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"];
            readonly mono: readonly ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"];
        };
        readonly fontSize: {
            readonly xs: "12px";
            readonly sm: "14px";
            readonly base: "16px";
            readonly lg: "18px";
            readonly xl: "20px";
            readonly "2xl": "24px";
            readonly "3xl": "30px";
            readonly "4xl": "36px";
            readonly "5xl": "48px";
            readonly "6xl": "60px";
        };
        readonly fontWeight: {
            readonly light: "300";
            readonly normal: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
        readonly lineHeight: {
            readonly tight: "1.25";
            readonly normal: "1.5";
            readonly relaxed: "1.75";
        };
    };
    readonly radii: {
        readonly none: "0px";
        readonly sm: "4px";
        readonly md: "8px";
        readonly lg: "12px";
        readonly xl: "16px";
        readonly "2xl": "24px";
        readonly full: "9999px";
    };
    readonly shadows: {
        readonly none: "none";
        readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        readonly base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
        readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
        readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
    };
    readonly motion: {
        readonly duration: {
            readonly fast: "150ms";
            readonly normal: "300ms";
            readonly slow: "500ms";
        };
        readonly easing: {
            readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
            readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
            readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
        };
    };
    readonly zIndex: {
        readonly base: "0";
        readonly overlay: "10";
        readonly modal: "20";
        readonly popover: "30";
        readonly tooltip: "40";
    };
    readonly breakpoints: {
        readonly sm: "640px";
        readonly md: "768px";
        readonly lg: "1024px";
        readonly xl: "1280px";
        readonly "2xl": "1536px";
    };
    readonly semantic: {
        readonly colors: {
            readonly background: "#ffffff";
            readonly surface: "#ffffff";
            readonly border: "#e5e7eb";
            readonly text: {
                readonly primary: "#111827";
                readonly secondary: "#6b7280";
                readonly tertiary: "#9ca3af";
                readonly inverse: "#ffffff";
            };
            readonly primary: "#0ea5e9";
            readonly secondary: "#64748b";
            readonly success: "#10b981";
            readonly warning: "#f59e0b";
            readonly error: "#ef4444";
            readonly info: "#3b82f6";
        };
        readonly spacing: {
            readonly 0: "0px";
            readonly 1: "4px";
            readonly 2: "8px";
            readonly 3: "12px";
            readonly 4: "16px";
            readonly 5: "20px";
            readonly 6: "24px";
            readonly 8: "32px";
            readonly 10: "40px";
            readonly 12: "48px";
            readonly 16: "64px";
            readonly 20: "80px";
            readonly 24: "96px";
            readonly 32: "128px";
            readonly 40: "160px";
            readonly 48: "192px";
            readonly 56: "224px";
            readonly 64: "256px";
        };
        readonly radii: {
            readonly none: "0px";
            readonly sm: "4px";
            readonly md: "8px";
            readonly lg: "12px";
            readonly xl: "16px";
            readonly "2xl": "24px";
            readonly full: "9999px";
        };
        readonly shadows: {
            readonly none: "none";
            readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
            readonly base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
            readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
            readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
            readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
        };
        readonly typography: {
            readonly fontFamily: {
                readonly sans: readonly ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"];
                readonly mono: readonly ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"];
            };
            readonly fontSize: {
                readonly xs: "12px";
                readonly sm: "14px";
                readonly base: "16px";
                readonly lg: "18px";
                readonly xl: "20px";
                readonly "2xl": "24px";
                readonly "3xl": "30px";
                readonly "4xl": "36px";
                readonly "5xl": "48px";
                readonly "6xl": "60px";
            };
            readonly fontWeight: {
                readonly light: "300";
                readonly normal: "400";
                readonly medium: "500";
                readonly semibold: "600";
                readonly bold: "700";
            };
            readonly lineHeight: {
                readonly tight: "1.25";
                readonly normal: "1.5";
                readonly relaxed: "1.75";
            };
        };
        readonly motion: {
            readonly duration: {
                readonly fast: "150ms";
                readonly normal: "300ms";
                readonly slow: "500ms";
            };
            readonly easing: {
                readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
                readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
                readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
                readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
            };
        };
    };
};
export type Tokens = typeof colors & typeof spacing & typeof typography & typeof radii & typeof shadows & typeof motion & typeof zIndex & typeof breakpoints & typeof semantic;
//# sourceMappingURL=tokens.d.ts.map