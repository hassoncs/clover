export declare const tailwindPreset: {
    readonly darkMode: "class";
    readonly theme: {
        readonly extend: {
            readonly colors: {
                readonly primary: {
                    readonly DEFAULT: "#0ea5e9";
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
                    readonly DEFAULT: "#64748b";
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
                readonly destructive: {
                    readonly DEFAULT: "#ef4444";
                    readonly foreground: "#ffffff";
                };
                readonly muted: {
                    readonly DEFAULT: "#f1f5f9";
                    readonly foreground: "#64748b";
                };
                readonly accent: {
                    readonly DEFAULT: "#f1f5f9";
                    readonly foreground: "#0f172a";
                };
                readonly popover: {
                    readonly DEFAULT: "#ffffff";
                    readonly foreground: "#000000";
                };
                readonly card: {
                    readonly DEFAULT: "#ffffff";
                    readonly foreground: "#000000";
                };
                readonly input: "#e5e7eb";
                readonly ring: "#0ea5e9";
                readonly surface: "#ffffff";
                readonly background: "#ffffff";
                readonly border: "#e5e7eb";
                readonly text: {
                    readonly primary: "#111827";
                    readonly secondary: "#6b7280";
                    readonly tertiary: "#9ca3af";
                    readonly inverse: "#ffffff";
                };
                readonly theme: {
                    readonly background: string;
                    readonly surface: {
                        readonly DEFAULT: string;
                        readonly elevated: string;
                    };
                    readonly border: string;
                    readonly text: {
                        readonly DEFAULT: string;
                        readonly primary: string;
                        readonly secondary: string;
                        readonly tertiary: string;
                        readonly muted: string;
                        readonly inverse: string;
                    };
                    readonly primary: string;
                    readonly secondary: string;
                    readonly success: string;
                    readonly warning: string;
                    readonly error: string;
                    readonly danger: string;
                };
                readonly amen: {
                    readonly glow: "rgb(var(--amen-glow-gold) / <alpha-value>)";
                    readonly warmWhite: "rgb(var(--amen-warm-white) / <alpha-value>)";
                    readonly softYellow: "rgb(var(--amen-soft-yellow) / <alpha-value>)";
                    readonly golden: "rgb(var(--amen-golden-accent) / <alpha-value>)";
                };
                readonly ed: {
                    readonly bg: string;
                    readonly surface: {
                        readonly DEFAULT: string;
                        readonly hover: string;
                        readonly active: string;
                    };
                    readonly border: {
                        readonly DEFAULT: string;
                        readonly strong: string;
                    };
                    readonly text: {
                        readonly DEFAULT: string;
                        readonly secondary: string;
                        readonly muted: string;
                    };
                    readonly accent: {
                        readonly DEFAULT: string;
                        readonly hover: string;
                        readonly muted: string;
                    };
                    readonly success: string;
                    readonly warning: string;
                    readonly error: string;
                    readonly activityBar: {
                        readonly bg: string;
                        readonly icon: string;
                        readonly iconActive: string;
                        readonly indicator: string;
                    };
                    readonly titleBar: {
                        readonly bg: string;
                    };
                    readonly tab: {
                        readonly bg: string;
                        readonly activeBg: string;
                        readonly border: string;
                        readonly text: string;
                        readonly activeText: string;
                    };
                    readonly panel: {
                        readonly bg: string;
                        readonly headerBg: string;
                    };
                    readonly input: {
                        readonly bg: string;
                        readonly border: string;
                        readonly text: string;
                        readonly placeholder: string;
                    };
                };
                readonly grainient: {
                    readonly ultraviolet: {
                        readonly surface: "rgb(var(--grainient-ultraviolet-surface) / <alpha-value>)";
                        readonly text: "rgb(var(--grainient-ultraviolet-text) / <alpha-value>)";
                        readonly border: "rgb(var(--grainient-ultraviolet-border) / <alpha-value>)";
                    };
                    readonly ember: {
                        readonly surface: "rgb(var(--grainient-ember-surface) / <alpha-value>)";
                        readonly text: "rgb(var(--grainient-ember-text) / <alpha-value>)";
                        readonly border: "rgb(var(--grainient-ember-border) / <alpha-value>)";
                    };
                    readonly abyss: {
                        readonly surface: "rgb(var(--grainient-abyss-surface) / <alpha-value>)";
                        readonly text: "rgb(var(--grainient-abyss-text) / <alpha-value>)";
                        readonly border: "rgb(var(--grainient-abyss-border) / <alpha-value>)";
                    };
                    readonly amen: {
                        readonly surface: "rgb(var(--grainient-amen-surface) / <alpha-value>)";
                        readonly text: "rgb(var(--grainient-amen-text) / <alpha-value>)";
                        readonly border: "rgb(var(--grainient-amen-border) / <alpha-value>)";
                    };
                    readonly amenWarm: {
                        readonly surface: "rgb(var(--grainient-amenWarm-surface) / <alpha-value>)";
                        readonly text: "rgb(var(--grainient-amenWarm-text) / <alpha-value>)";
                        readonly border: "rgb(var(--grainient-amenWarm-border) / <alpha-value>)";
                    };
                    readonly glass: {
                        readonly DEFAULT: "rgb(var(--grainient-glass) / <alpha-value>)";
                        readonly hover: "rgb(var(--grainient-glass-hover) / <alpha-value>)";
                        readonly active: "rgb(var(--grainient-glass-active) / <alpha-value>)";
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
            readonly borderRadius: {
                readonly none: "0px";
                readonly sm: "4px";
                readonly md: "8px";
                readonly lg: "12px";
                readonly xl: "16px";
                readonly "2xl": "24px";
                readonly full: "9999px";
            };
            readonly boxShadow: {
                readonly none: "none";
                readonly sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
                readonly base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
                readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
                readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
                readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
            };
            readonly transitionDuration: {
                readonly fast: "150ms";
                readonly normal: "300ms";
                readonly slow: "500ms";
            };
            readonly transitionTimingFunction: {
                readonly ease: "cubic-bezier(0.4, 0, 0.2, 1)";
                readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
                readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
                readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
            };
            readonly zIndex: {
                readonly base: "0";
                readonly overlay: "10";
                readonly modal: "20";
                readonly popover: "30";
                readonly tooltip: "40";
            };
            readonly screens: {
                readonly sm: "640px";
                readonly md: "768px";
                readonly lg: "1024px";
                readonly xl: "1280px";
                readonly "2xl": "1536px";
            };
        };
    };
    readonly plugins: readonly [];
};
export default tailwindPreset;
//# sourceMappingURL=tailwind.d.ts.map