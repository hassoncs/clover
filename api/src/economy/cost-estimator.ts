import { USER_COSTS, microsToSparks, formatSparks } from '@/economy/pricing'
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition'

export interface CostEstimate {
  totalMicros: number;
  breakdown: CostBreakdownItem[];
  displayTotal: string;  // "150 ⚡"
}

export interface CostBreakdownItem {
  description: string;
  count: number;
  unitCostMicros: number;
  totalMicros: number;
}

/**
 * Estimate the cost of generating assets for a game
 */
export function estimateGameAssetCost(
  gameDefinition: GameDefinition,
  options: {
    regenerateAll?: boolean;
    specificPrefabs?: string[];
  } = {}
): CostEstimate {
  const breakdown: CostBreakdownItem[] = [];
  const prefabs = gameDefinition.prefabs ?? {};
  const prefabIds = Object.keys(prefabs);
  
  // Filter prefabs if specific ones requested
  const prefabsToGenerate = options.specificPrefabs
    ? prefabIds.filter(id => options.specificPrefabs!.includes(id))
    : prefabIds;
  
  // Identify special prefabs by ID pattern or naming convention
  const backgroundCount = prefabsToGenerate.filter(id => 
    id.includes('background') || id.includes('bg')
  ).length;
  
  const parallaxCount = prefabsToGenerate.filter(id => 
    id.includes('parallax') || id.includes('layer')
  ).length;
  
  const titleHeroCount = prefabsToGenerate.filter(id => 
    id.includes('title') || id.includes('hero')
  ).length;
  
  const titleHeroNoBgCount = prefabsToGenerate.filter(id => 
    id.includes('title_hero_no_bg') || id.includes('hero_no_bg')
  ).length;
  
  const entityCount = prefabsToGenerate.length - backgroundCount - parallaxCount - titleHeroCount - titleHeroNoBgCount;
  
  // Build breakdown
  if (entityCount > 0) {
    breakdown.push({
      description: 'Entity sprites',
      count: entityCount,
      unitCostMicros: USER_COSTS.ASSET_ENTITY,
      totalMicros: entityCount * USER_COSTS.ASSET_ENTITY,
    });
  }
  
  if (backgroundCount > 0) {
    breakdown.push({
      description: 'Backgrounds',
      count: backgroundCount,
      unitCostMicros: USER_COSTS.ASSET_BACKGROUND,
      totalMicros: backgroundCount * USER_COSTS.ASSET_BACKGROUND,
    });
  }
  
  if (parallaxCount > 0) {
    breakdown.push({
      description: 'Parallax layers',
      count: parallaxCount,
      unitCostMicros: USER_COSTS.ASSET_PARALLAX,
      totalMicros: parallaxCount * USER_COSTS.ASSET_PARALLAX,
    });
  }
  
  if (titleHeroCount > 0) {
    breakdown.push({
      description: 'Title/Hero images',
      count: titleHeroCount,
      unitCostMicros: USER_COSTS.ASSET_TITLE_HERO,
      totalMicros: titleHeroCount * USER_COSTS.ASSET_TITLE_HERO,
    });
  }
  
  if (titleHeroNoBgCount > 0) {
    breakdown.push({
      description: 'Title/Hero images (no bg)',
      count: titleHeroNoBgCount,
      unitCostMicros: USER_COSTS.ASSET_TITLE_HERO_NO_BG,
      totalMicros: titleHeroNoBgCount * USER_COSTS.ASSET_TITLE_HERO_NO_BG,
    });
  }
  
  // Calculate total
  let totalMicros = breakdown.reduce((sum, item) => sum + item.totalMicros, 0);
  
  // Apply bulk discount for full regeneration
  if (options.regenerateAll && prefabsToGenerate.length >= 5) {
    const discount = totalMicros * (1 - USER_COSTS.FULL_GAME_RESKIN_DISCOUNT);
    breakdown.push({
      description: 'Bulk discount (20%)',
      count: 1,
      unitCostMicros: -discount,
      totalMicros: -discount,
    });
    totalMicros -= discount;
  }
  
  return {
    totalMicros: Math.ceil(totalMicros),
    breakdown,
    displayTotal: formatSparks(totalMicros),
  };
}

/**
 * Estimate cost for a single operation
 */
export function estimateOperationCost(
  operationType: keyof typeof USER_COSTS
): { micros: number; display: string } {
  const micros = USER_COSTS[operationType];
  return {
    micros,
    display: formatSparks(micros),
  };
}
