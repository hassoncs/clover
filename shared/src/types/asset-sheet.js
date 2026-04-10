/**
 * Asset Sheet Types
 *
 * Unified model for sprite sheets, tile sheets, and variation sheets.
 * All share: atlas PNG + layout + entries + per-kind semantics + prompt overrides.
 */
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Calculate the total image dimensions from a layout
 */
export function calculateSheetDimensions(layout) {
    if (layout.type === "grid") {
        const margin = layout.margin ?? 0;
        const spacing = layout.spacing ?? 0;
        const width = margin * 2 +
            layout.columns * layout.cellWidth +
            (layout.columns - 1) * spacing;
        const height = margin * 2 +
            layout.rows * layout.cellHeight +
            (layout.rows - 1) * spacing;
        return { width, height };
    }
    if (layout.type === "strip") {
        const margin = layout.margin ?? 0;
        const spacing = layout.spacing ?? 0;
        if (layout.direction === "horizontal") {
            const width = margin * 2 +
                layout.frameCount * layout.cellWidth +
                (layout.frameCount - 1) * spacing;
            const height = margin * 2 + layout.cellHeight;
            return { width, height };
        }
        else {
            const width = margin * 2 + layout.cellWidth;
            const height = margin * 2 +
                layout.frameCount * layout.cellHeight +
                (layout.frameCount - 1) * spacing;
            return { width, height };
        }
    }
    return { width: 0, height: 0 };
}
/**
 * Get the region rect for a given entry
 */
export function getEntryRegionRect(entry, _layout) {
    return entry.region;
}
/**
 * Get the effective prompt for an entry (base + override resolution)
 */
export function getEntryPrompt(entry, promptConfig) {
    if (!promptConfig) {
        return null;
    }
    // If entry has an override, use it
    if (entry.promptOverride) {
        return entry.promptOverride;
    }
    // Otherwise use base prompt
    return promptConfig.basePrompt;
}
/**
 * Resolve a variant to its entry ID given a variant key
 */
export function resolveVariantEntryId(group, variantKey) {
    const variant = group.variants[variantKey];
    return variant?.entryId ?? null;
}
/**
 * Select a variant by index (for deterministic Match-3 mapping)
 * Uses group.order if available, else falls back to sorted keys
 */
export function selectVariantByIndex(sheet, groupId, index) {
    if (sheet.kind !== "variation" || !sheet.groups)
        return null;
    const group = sheet.groups[groupId] ?? sheet.groups[sheet.defaultGroupId ?? "default"];
    if (!group)
        return null;
    const variantKeys = group.order ?? Object.keys(group.variants).sort();
    const variantKey = variantKeys[index];
    if (!variantKey)
        return null;
    const variant = group.variants[variantKey];
    if (!variant)
        return null;
    const entry = sheet.entries[variant.entryId];
    if (!entry)
        return null;
    // Get region rect
    const rect = getEntryRegionRect(entry, sheet.layout);
    if (!rect)
        return null;
    return { entryId: variant.entryId, region: rect };
}
//# sourceMappingURL=asset-sheet.js.map