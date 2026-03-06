const fs = require('fs');

let content = fs.readFileSync('apps/pencil/app/index.tsx', 'utf8');

// 1. Replace C with THEMES and ThemeContext
const themesCode = `const THEMES = {
	dark: {
		bg: "#0d0d0d",
		sidebar: "#111111",
		border: "#242424",
		text: "#e8e8e8",
		accent: "#818cf8",
		textMuted: "#a1a1aa",
		iconMuted: "#555555",
		rowHover: "#2a2a2a",
		rowSelected: "#1e1e2a",
		bubbleAi: "#1a1a1a",
		bubbleUser: "#818cf8",
		surface: "#141414",
		trafficLightClose: "#ff5f57",
		trafficLightMinimize: "#febc2e",
		trafficLightMaximize: "#28c840",
	},
	light: {
		bg: "#ffffff",
		sidebar: "#f5f5f5",
		border: "#e0e0e0",
		text: "#1a1a1a",
		accent: "#6366f1",
		textMuted: "#71717a",
		iconMuted: "#a1a1aa",
		rowHover: "#e4e4e7",
		rowSelected: "#d4d4d8",
		bubbleAi: "#f4f4f5",
		bubbleUser: "#6366f1",
		surface: "#fafafa",
		trafficLightClose: "#ff5f57",
		trafficLightMinimize: "#febc2e",
		trafficLightMaximize: "#28c840",
	}
} as const;

type Theme = "dark" | "light";
type ThemeColors = typeof THEMES.dark;

const ThemeContext = React.createContext<{ theme: Theme; colors: ThemeColors }>({
	theme: "dark",
	colors: THEMES.dark,
});

function useTheme() {
	return React.useContext(ThemeContext);
}`;

content = content.replace(/const C = \{[\s\S]*?\} as const;/, themesCode);

// Add React to imports if not there
if (!content.includes('import React')) {
    content = content.replace('import { useCallback', 'import React, { useCallback');
}

// 2. Change StyleSheet.create to functions
content = content.replace(/const sharedStyles = StyleSheet\.create\(\{/g, 'const getSharedStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const titleBarStyles = StyleSheet\.create\(\{/g, 'const getTitleBarStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const toolSidebarStyles = StyleSheet\.create\(\{/g, 'const getToolSidebarStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const layersPanelStyles = StyleSheet\.create\(\{/g, 'const getLayersPanelStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const chatSidebarStyles = StyleSheet\.create\(\{/g, 'const getChatSidebarStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const chatCollapsedStripStyles = StyleSheet\.create\(\{/g, 'const getChatCollapsedStripStyles = (C: ThemeColors) => StyleSheet.create({');
content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const getStyles = (C: ThemeColors) => StyleSheet.create({');

// 3. Add STYLES object at the end
const stylesObj = `
const STYLES = {
	dark: {
		shared: getSharedStyles(THEMES.dark),
		titleBar: getTitleBarStyles(THEMES.dark),
		toolSidebar: getToolSidebarStyles(THEMES.dark),
		layersPanel: getLayersPanelStyles(THEMES.dark),
		chatSidebar: getChatSidebarStyles(THEMES.dark),
		chatCollapsedStrip: getChatCollapsedStripStyles(THEMES.dark),
		main: getStyles(THEMES.dark),
	},
	light: {
		shared: getSharedStyles(THEMES.light),
		titleBar: getTitleBarStyles(THEMES.light),
		toolSidebar: getToolSidebarStyles(THEMES.light),
		layersPanel: getLayersPanelStyles(THEMES.light),
		chatSidebar: getChatSidebarStyles(THEMES.light),
		chatCollapsedStrip: getChatCollapsedStripStyles(THEMES.light),
		main: getStyles(THEMES.light),
	}
};
`;
content += stylesObj;

// 4. Update components to use useTheme
function injectTheme(componentName, styleName) {
    const regex = new RegExp(`function ${componentName}\\(([^)]*)\\) \\{`);
    content = content.replace(regex, (match, props) => {
        return `function ${componentName}(${props}) {\n\tconst { theme, colors: C } = useTheme();\n\tconst ${styleName} = STYLES[theme].${styleName === 'styles' ? 'main' : styleName};`;
    });
}

injectTheme('ToolSidebar', 'toolSidebarStyles');
injectTheme('LayersPanel', 'layersPanelStyles');
injectTheme('ChatSidebar', 'chatSidebarStyles');
injectTheme('ChatCollapsedStrip', 'chatCollapsedStripStyles');
injectTheme('IconButton', 'sharedStyles');
injectTheme('ActionButton', 'sharedStyles');

// TitleBar needs special handling for props
content = content.replace(
    /interface TitleBarProps \{([\s\S]*?)\}/,
    `interface TitleBarProps {$1\ttheme: Theme;\n\tonToggleTheme: () => void;\n}`
);

content = content.replace(
    /function TitleBar\(\{([\s\S]*?)\}: TitleBarProps\) \{/,
    `function TitleBar({$1, theme, onToggleTheme}: TitleBarProps) {\n\tconst { colors: C } = useTheme();\n\tconst titleBarStyles = STYLES[theme].titleBar;`
);

content = content.replace(
    /<IconButton icon="sunny-outline" accessibilityLabel="Theme" \/>/,
    `<IconButton icon={theme === "dark" ? "sunny-outline" : "moon-outline"} onPress={onToggleTheme} accessibilityLabel="Toggle Theme" />`
);

// PencilScreen needs special handling
content = content.replace(
    /export default function PencilScreen\(\) \{/,
    `export default function PencilScreen() {\n\tconst [theme, setTheme] = useState<Theme>("dark");\n\tconst colors = THEMES[theme];\n\tconst styles = STYLES[theme].main;`
);

content = content.replace(
    /<SafeAreaView style=\{styles\.root\}>/,
    `<ThemeContext.Provider value={{ theme, colors }}>\n\t\t<SafeAreaView style={styles.root}>`
);

content = content.replace(
    /<\/SafeAreaView>/,
    `</SafeAreaView>\n\t\t</ThemeContext.Provider>`
);

content = content.replace(
    /isConnected=\{isConnected\}/,
    `isConnected={isConnected}\n\t\t\t\ttheme={theme}\n\t\t\t\tonToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}`
);

fs.writeFileSync('apps/pencil/app/index.tsx', content);
