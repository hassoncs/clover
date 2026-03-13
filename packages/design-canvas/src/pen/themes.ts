import type { PenTheme } from "@slopcade/protocol/pen";

export interface ThemeContext {
	axes: Record<string, string>;
}

export const DEFAULT_THEME_CONTEXT: ThemeContext = { axes: {} };

export function buildThemeContext(
	documentThemes: PenTheme[] | undefined,
	nodeThemeOverride?: Record<string, string>,
	parentContext?: ThemeContext,
): ThemeContext {
	const axes: Record<string, string> = {};

	if (documentThemes) {
		for (const theme of documentThemes) {
			if (theme.default !== undefined) {
				axes[theme.name] = theme.default;
			} else if (theme.values.length > 0) {
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
