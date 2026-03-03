export type TextMeasureFn = (
	text: string,
	fontSize: number,
	fontFamily: string,
	fontWeight?: string,
	maxWidth?: number,
) => { width: number; height: number };

/**
 * Estimate text dimensions based on character count and font size.
 * Uses a 0.6 ratio for character width approximation.
 */
export function estimateTextSize(
	text: string,
	fontSize: number,
	_fontFamily: string,
	_fontWeight?: string,
	maxWidth?: number,
): { width: number; height: number } {
	const lineHeight = fontSize * 1.2;
	const singleLineWidth = text.length * fontSize * 0.6;

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
