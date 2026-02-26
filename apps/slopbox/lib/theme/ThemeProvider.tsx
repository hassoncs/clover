import type { EditorThemeColors, EditorThemeName } from "@slopcade/theme";
import { editorThemes } from "@slopcade/theme";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Platform } from "react-native";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";

const THEME_STORAGE_KEY = "slopbox-color-scheme";

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

function applyWebThemeClass(scheme: EditorThemeName) {
	if (Platform.OS !== "web") return;
	const root = document.documentElement;
	if (scheme === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [colorScheme, setColorScheme] = useState<EditorThemeName>("dark");

	useEffect(() => {
		getStorageItem<EditorThemeName>(THEME_STORAGE_KEY, "dark").then((saved) => {
			setColorScheme(saved);
			applyWebThemeClass(saved);
		});
	}, []);

	const setTheme = useCallback((scheme: EditorThemeName) => {
		setColorScheme(scheme);
		applyWebThemeClass(scheme);
		setStorageItem(THEME_STORAGE_KEY, scheme);
	}, []);

	const toggleTheme = useCallback(() => {
		setColorScheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			applyWebThemeClass(next);
			setStorageItem(THEME_STORAGE_KEY, next);
			return next;
		});
	}, []);

	const value: ThemeContextValue = {
		colorScheme,
		editorColors: editorThemes[colorScheme],
		toggleTheme,
		setTheme,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
