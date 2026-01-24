/**
 * Asset Sheet Types
 * 
 * Unified model for sprite sheets, tile sheets, and variation sheets.
 * All share: atlas PNG + layout + entries + per-kind semantics + prompt overrides.
 */

import { z } from 'zod';

// =============================================================================
// SHEET KINDS
// =============================================================================

export type AssetSheetKind = 'sprite' | 'tile' | 'variation';

// =============================================================================
// LAYOUT TYPES
// =============================================================================

export type SheetLayout =
  | {
      type: 'grid';
      columns: number;
      rows: number;
      cellWidth: number;
      cellHeight: number;
      spacing?: number; // pixels between cells
      margin?: number;  // pixels around grid
      origin?: 'top-left';
    }
  | {
      type: 'strip';
      direction: 'horizontal' | 'vertical';
      frameCount: number;
      cellWidth: number;
      cellHeight: number;
      spacing?: number;
      margin?: number;
    }
  | {
      type: 'manual';
      // entries must provide explicit rects
    };

// =============================================================================
// REGION TYPES
// =============================================================================

export type SheetRegion =
  | { type: 'gridIndex'; index: number } // 0..(columns*rows-1), row-major
  | { type: 'rect'; x: number; y: number; w: number; h: number };

export interface SheetPivot {
  x: number; // pixels relative to the entry rect
  y: number;
}

// =============================================================================
// PROMPT CONFIGURATION
// =============================================================================

export interface SheetPromptConfig {
  // The base prompt applied to ALL entries (unless overridden)
  basePrompt: string;
  
  // Optional: modifiers appended to all prompts
  commonModifiers?: string[];
  
  // Optional: style preset (can affect model selection)
  stylePreset?: string;
  
  // Optional: negative prompt applied to all entries
  negativePrompt?: string;
}

// =============================================================================
// SHEET ENTRY (Shared by all sheet kinds)
// =============================================================================

export interface AssetSheetEntry {
  id: string;              // stable key (e.g. "run_0", "brick/red", "tile:17")
  region: SheetRegion;
  pivot?: SheetPivot;
  tags?: string[];
  
  // Per-entry prompt override (supports long-form descriptions)
  // If present, this completely replaces the base prompt for this entry
  promptOverride?: string;
}

// =============================================================================
// SPRITE SHEET SEMANTICS
// =============================================================================

export interface SheetAnimation {
  id: string;              // "idle", "run", "explode"
  frames: string[];        // array of AssetSheetEntry.id
  fps: number;
  loop?: boolean;
}

// =============================================================================
// TILE SHEET SEMANTICS
// =============================================================================

export interface SheetTileCollision {
  type: 'none' | 'full' | 'platform';
  polygon?: { x: number; y: number }[];
}

export interface SheetTileAnimation {
  frames: number[]; // grid indices
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

// =============================================================================
// VARIATION SHEET SEMANTICS
// =============================================================================

export interface VariationVariant {
  entryId: string;
  tags?: string[];
  weight?: number;  // for random selection
  
  // Per-variant prompt override (supports long-form descriptions)
  promptOverride?: string;
}

export interface VariationGroup {
  id: string; // usually the semantic "thing": "brick", "peg", "gem"
  variants: Record<string, VariationVariant>;
}

// =============================================================================
// ASSET SHEET BASE
// =============================================================================

export interface AssetSheetBase {
  id: string;
  packId: string;          // owned by AssetPackV2
  source: 'generated' | 'uploaded' | 'none';
  imageAssetId?: string;   // references GameAsset.id (optional for pre-uploaded)
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  layout: SheetLayout;
  entries: Record<string, AssetSheetEntry>;
  promptConfig?: SheetPromptConfig;  // Base prompt + overrides for entries
  createdAt: number;
  deletedAt?: number;
}

// =============================================================================
// DISCRIMINATED UNION - Full AssetSheet Type
// =============================================================================

export type AssetSheet =
  | (AssetSheetBase & {
      kind: 'sprite';
      animations?: Record<string, SheetAnimation>;
      defaultAnimationId?: string;
    })
  | (AssetSheetBase & {
      kind: 'tile';
      tileWidth: number;
      tileHeight: number;
      tiles?: Record<number, SheetTileMetadata>;
    })
  | (AssetSheetBase & {
      kind: 'variation';
      groups: Record<string, VariationGroup>;
      defaultGroupId?: string;
      defaultVariantKey?: string;
    });

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate the total image dimensions from a layout
 */
export function calculateSheetDimensions(layout: SheetLayout): { width: number; height: number } {
  if (layout.type === 'grid') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    const width = margin * 2 + layout.columns * layout.cellWidth + (layout.columns - 1) * spacing;
    const height = margin * 2 + layout.rows * layout.cellHeight + (layout.rows - 1) * spacing;
    return { width, height };
  }
  
  if (layout.type === 'strip') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    if (layout.direction === 'horizontal') {
      const width = margin * 2 + layout.frameCount * layout.cellWidth + (layout.frameCount - 1) * spacing;
      const height = margin * 2 + layout.cellHeight;
      return { width, height };
    } else {
      const width = margin * 2 + layout.cellWidth;
      const height = margin * 2 + layout.frameCount * layout.cellHeight + (layout.frameCount - 1) * spacing;
      return { width, height };
    }
  }
  
  return { width: 0, height: 0 };
}

/**
 * Get the region rect for a given entry
 */
export function getEntryRegionRect(entry: AssetSheetEntry, layout: SheetLayout): { x: number; y: number; w: number; h: number } | null {
  if (entry.region.type === 'rect') {
    return { x: entry.region.x, y: entry.region.y, w: entry.region.w, h: entry.region.h };
  }
  
  if (entry.region.type === 'gridIndex' && layout.type === 'grid') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    const col = entry.region.index % layout.columns;
    const row = Math.floor(entry.region.index / layout.columns);
    const x = margin + col * (layout.cellWidth + spacing);
    const y = margin + row * (layout.cellHeight + spacing);
    return { x, y, w: layout.cellWidth, h: layout.cellHeight };
  }
  
  if (entry.region.type === 'gridIndex' && layout.type === 'strip') {
    const margin = layout.margin ?? 0;
    const spacing = layout.spacing ?? 0;
    const index = entry.region.index;
    if (layout.direction === 'horizontal') {
      const x = margin + index * (layout.cellWidth + spacing);
      const y = margin;
      return { x, y, w: layout.cellWidth, h: layout.cellHeight };
    } else {
      const x = margin;
      const y = margin + index * (layout.cellHeight + spacing);
      return { x, y, w: layout.cellWidth, h: layout.cellHeight };
    }
  }
  
  return null;
}

/**
 * Get the effective prompt for an entry (base + override resolution)
 */
export function getEntryPrompt(entry: AssetSheetEntry, promptConfig?: SheetPromptConfig): string | null {
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
export function resolveVariantEntryId(
  group: VariationGroup,
  variantKey: string
): string | null {
  const variant = group.variants[variantKey];
  return variant?.entryId ?? null;
}
