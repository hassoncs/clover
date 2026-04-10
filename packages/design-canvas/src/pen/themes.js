export const DEFAULT_THEME_CONTEXT = { axes: {} };
export function buildThemeContext(documentThemes, nodeThemeOverride, parentContext) {
    const axes = {};
    if (documentThemes) {
        for (const theme of documentThemes) {
            if (theme.default !== undefined) {
                axes[theme.name] = theme.default;
            }
            else if (theme.values.length > 0) {
                axes[theme.name] = theme.values[0];
            }
        }
    }
    if (parentContext) {
        Object.assign(axes, parentContext.axes);
    }
    if (nodeThemeOverride) {
        Object.assign(axes, nodeThemeOverride);
    }
    return { axes };
}
//# sourceMappingURL=themes.js.map