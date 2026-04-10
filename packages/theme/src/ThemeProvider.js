import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState, } from "react";
import { editorThemes, } from "./tokens";
const ThemeContext = createContext({
    colorScheme: "dark",
    editorColors: editorThemes.dark,
    toggleTheme: () => { },
    setTheme: () => { },
});
export function ThemeProvider({ children }) {
    const [colorScheme, setColorScheme] = useState("dark");
    const setTheme = useCallback((scheme) => {
        setColorScheme(scheme);
    }, []);
    const toggleTheme = useCallback(() => {
        setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);
    const value = useMemo(() => ({
        colorScheme,
        editorColors: editorThemes[colorScheme],
        toggleTheme,
        setTheme,
    }), [colorScheme, toggleTheme, setTheme]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
}
export function useTheme() {
    return useContext(ThemeContext);
}
//# sourceMappingURL=ThemeProvider.js.map