import type { AssetSheet, VariationVariant, SheetRegion } from '@slopcade/shared';

/**
 * Weighted random selection from an array of items with optional weight property
 */
function weightedRandom<T extends { weight?: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight ?? 1;
    if (random <= 0) return item;
  }
  
  return items[items.length - 1];
}

/**
 * Select a variant from a variation sheet
 * 
 * @param sheetMetadata - The variation sheet containing groups and entries
 * @param groupId - The ID of the variation group to select from
 * @param variantKey - Optional specific variant key. If omitted, uses weighted random selection
 * @returns The selected variant's entry ID and region, or null if not found
 */
export function selectVariant(
  sheetMetadata: AssetSheet,
  groupId: string,
  variantKey?: string
): { entryId: string; region: SheetRegion } | null {
  if (sheetMetadata.kind !== 'variation') {
    return null;
  }

  const group = sheetMetadata.groups?.[groupId];
  if (!group) {
    return null;
  }

  let variant: VariationVariant | undefined;
  
  if (variantKey !== undefined) {
    variant = group.variants[variantKey];
  } else {
    const variants = Object.values(group.variants);
    if (variants.length === 0) {
      return null;
    }
    variant = weightedRandom(variants);
  }

  if (!variant) {
    return null;
  }

  const entry = sheetMetadata.entries[variant.entryId];
  if (!entry) {
    return null;
  }

  return {
    entryId: variant.entryId,
    region: entry.region,
  };
}
