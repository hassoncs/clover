import type { ReactNode } from "react";
import { type EditorThemeColors, type EditorThemeName } from "./tokens";
interface ThemeContextValue {
    colorScheme: EditorThemeName;
    editorColors: EditorThemeColors;
    toggleTheme: () => void;
    setTheme: (scheme: EditorThemeName) => void;
}
export declare function ThemeProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTheme(): ThemeContextValue;
export {};
//# sourceMappingURL=ThemeProvider.d.ts.map