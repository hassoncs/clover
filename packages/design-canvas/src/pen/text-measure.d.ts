export type TextMeasureFn = (text: string, fontSize: number, fontFamily: string, fontWeight?: string, maxWidth?: number) => {
    width: number;
    height: number;
};
/**
 * Estimate text dimensions based on character count and font size.
 * Monospace fonts use a wider character-width ratio (0.62) than proportional
 * fonts (0.55) to better approximate actual rendered widths.
 * Adds a small buffer (10%) to avoid premature line wrapping.
 */
export declare function estimateTextSize(text: string, fontSize: number, fontFamily: string, fontWeight?: string, maxWidth?: number): {
    width: number;
    height: number;
};
//# sourceMappingURL=text-measure.d.ts.map