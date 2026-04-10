import type { PenTheme } from "@slopcade/shared/types/pen";
export interface ThemeContext {
    axes: Record<string, string>;
}
export declare const DEFAULT_THEME_CONTEXT: ThemeContext;
export declare function buildThemeContext(documentThemes: PenTheme[] | undefined, nodeThemeOverride?: Record<string, string>, parentContext?: ThemeContext): ThemeContext;
//# sourceMappingURL=themes.d.ts.map