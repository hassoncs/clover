import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	type EditorThemeColors,
	type EditorThemeName,
	editorThemes,
} from "./tokens";

interface ThemeContextValue {
	colorScheme: EditorThemeName;
	editorColors: EditorThemeColors;
	toggleTheme: () => void;
	setTheme: (scheme: EditorThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
	colorScheme: "dark",
	editorColors: editorThemes.dark,
	toggleTheme: () => {},
	setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [colorScheme, setColorScheme] = useState<EditorThemeName>("dark");

	const setTheme = useCallback((scheme: EditorThemeName) => {
		setColorScheme(scheme);
	}, []);

	const toggleTheme = useCallback(() => {
		setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({
			colorScheme,
			editorColors: editorThemes[colorScheme],
			toggleTheme,
			setTheme,
		}),
		[colorScheme, toggleTheme, setTheme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
