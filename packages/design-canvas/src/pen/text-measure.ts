export type TextMeasureFn = (
	text: string,
	fontSize: number,
	fontFamily: string,
	fontWeight?: string,
	maxWidth?: number,
) => { width: number; height: number };

/** Known monospace font families. */
const MONOSPACE_FONTS = new Set([
	"JetBrains Mono",
	"Fira Code",
	"Source Code Pro",
	"Roboto Mono",
	"Courier New",
	"monospace",
]);

/**
 * Estimate text dimensions based on character count and font size.
 * Monospace fonts use a wider character-width ratio (0.62) than proportional
 * fonts (0.55) to better approximate actual rendered widths.
 * Adds a small buffer (10%) to avoid premature line wrapping.
 */
export function estimateTextSize(
	text: string,
	fontSize: number,
	fontFamily: string,
	fontWeight?: string,
	maxWidth?: number,
): { width: number; height: number } {
	const lineHeight = fontSize * 1.2;
	const isMonospace = MONOSPACE_FONTS.has(fontFamily);
	const isBold =
		fontWeight === "bold" ||
		fontWeight === "700" ||
		fontWeight === "800" ||
		fontWeight === "900";

	// Bold glyphs are ~15% wider than regular; monospace is fixed-width at 0.62.
	let charWidthRatio = isMonospace ? 0.62 : 0.55;
	if (isBold && !isMonospace) {
		charWidthRatio = 0.63;
	}

	// Add 10% buffer to prevent the Skia paragraph from wrapping when
	// the layout engine says it fits.
	const singleLineWidth = text.length * fontSize * charWidthRatio * 1.1;

	if (maxWidth !== undefined && singleLineWidth > maxWidth) {
		const lines = Math.ceil(singleLineWidth / maxWidth);
		return {
			width: maxWidth,
			height: lines * lineHeight,
		};
	}

	return {
		width: singleLineWidth,
		height: lineHeight,
	};
}
