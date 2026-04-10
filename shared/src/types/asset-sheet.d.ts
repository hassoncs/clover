/**
 * Asset Sheet Types
 *
 * Unified model for sprite sheets, tile sheets, and variation sheets.
 * All share: atlas PNG + layout + entries + per-kind semantics + prompt overrides.
 */
export type AssetSheetKind = "sprite" | "tile" | "variation";
export type SheetLayout = {
    type: "grid";
    columns: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    spacing?: number;
    margin?: number;
    origin?: "top-left";
} | {
    type: "strip";
    direction: "horizontal" | "vertical";
    frameCount: number;
    cellWidth: number;
    cellHeight: number;
    spacing?: number;
    margin?: number;
} | {
    type: "manual";
};
export type SheetRegion = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export interface SheetPivot {
    x: number;
    y: number;
}
export interface SheetPromptConfig {
    basePrompt: string;
    commonModifiers?: string[];
    stylePreset?: string;
}
export interface AssetSheetEntry {
    id: string;
    region: SheetRegion;
    pivot?: SheetPivot;
    tags?: string[];
    promptOverride?: string;
}
export interface SheetAnimation {
    id: string;
    frames: string[];
    fps: number;
    loop?: boolean;
}
export interface SheetTileCollision {
    type: "none" | "full" | "platform";
    polygon?: {
        x: number;
        y: number;
    }[];
}
export interface SheetTileAnimation {
    frames: number[];
    fps: number;
    loop?: boolean;
}
export interface SheetTileMetadata {
    name?: string;
    tags?: string[];
    collision?: SheetTileCollision;
    animation?: SheetTileAnimation;
    promptOverride?: string;
}
export interface VariationVariant {
    entryId: string;
    tags?: string[];
    weight?: number;
    promptOverride?: string;
}
export interface VariationGroup {
    id: string;
    variants: Record<string, VariationVariant>;
    order?: string[];
}
export interface AssetSheetBase {
    id: string;
    remixId: string;
    source: "generated" | "uploaded" | "none";
    imageAssetId?: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    layout: SheetLayout;
    entries: Record<string, AssetSheetEntry>;
    promptConfig?: SheetPromptConfig;
    createdAt: number;
    deletedAt?: number;
}
export type AssetSheet = (AssetSheetBase & {
    kind: "sprite";
    animations?: Record<string, SheetAnimation>;
    defaultAnimationId?: string;
}) | (AssetSheetBase & {
    kind: "tile";
    tileWidth: number;
    tileHeight: number;
    tiles?: Record<number, SheetTileMetadata>;
}) | (AssetSheetBase & {
    kind: "variation";
    groups?: Record<string, VariationGroup>;
    defaultGroupId?: string;
    defaultVariantKey?: string;
});
/**
 * Calculate the total image dimensions from a layout
 */
export declare function calculateSheetDimensions(layout: SheetLayout): {
    width: number;
    height: number;
};
/**
 * Get the region rect for a given entry
 */
export declare function getEntryRegionRect(entry: AssetSheetEntry, _layout: SheetLayout): SheetRegion;
/**
 * Get the effective prompt for an entry (base + override resolution)
 */
export declare function getEntryPrompt(entry: AssetSheetEntry, promptConfig?: SheetPromptConfig): string | null;
/**
 * Resolve a variant to its entry ID given a variant key
 */
export declare function resolveVariantEntryId(group: VariationGroup, variantKey: string): string | null;
/**
 * Select a variant by index (for deterministic Match-3 mapping)
 * Uses group.order if available, else falls back to sorted keys
 */
export declare function selectVariantByIndex(sheet: AssetSheet, groupId: string, index: number): {
    entryId: string;
    region: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
} | null;
//# sourceMappingURL=asset-sheet.d.ts.map