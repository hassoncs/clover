import type {
  SlotContract,
  SlotImplementation,
  PayoutConfig,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'slotMachine';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

export const SLOT_MACHINE_CONTRACTS: Record<string, SlotContract> = {
  symbolWeighting: {
    name: 'symbolWeighting',
    kind: 'pure',
    description: 'Selects symbol for reel position',
  },
  winDetection: {
    name: 'winDetection',
    kind: 'pure',
    description: 'Finds all-ways wins on grid',
  },
  payoutCalculation: {
    name: 'payoutCalculation',
    kind: 'pure',
    description: 'Calculates payout for wins',
  },
  bonusTrigger: {
    name: 'bonusTrigger',
    kind: 'policy',
    description: 'Checks for bonus triggers',
  },
  feedback: {
    name: 'feedback',
    kind: 'hook',
    description: 'Visual/audio feedback via tags',
  },
};

interface SymbolWeightingInput {
  reelIndex: number;
  positionIndex: number;
  symbolCount: number;
  weights?: number[];
}

type SymbolWeightingOutput = number;

export const uniformWeighting: SlotImplementation<
  SymbolWeightingInput,
  SymbolWeightingOutput
> = {
  id: 'uniform_weighting',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'symbolWeighting' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return Math.floor(Math.random() * input.symbolCount);
  },
};

interface WinDetectionInput {
  grid: number[][];
  rows: number;
  cols: number;
  symbolCount: number;
  wildSymbolIndex?: number;
  scatterSymbolIndex?: number;
  payouts: PayoutConfig[];
}

interface Win {
  symbol: number;
  count: number;
  ways: number;
  positions: Array<{ row: number; col: number }>;
  payout: number;
}

type WinDetectionOutput = Win[];

function calculatePayoutForWin(
  symbol: number,
  count: number,
  ways: number,
  payouts: PayoutConfig[]
): number {
  const symbolPayout = payouts.find((p) => p.symbolIndex === symbol);
  if (!symbolPayout) {
    return 0;
  }

  const multiplier = symbolPayout.counts[count];
  if (multiplier === undefined) {
    return 0;
  }

  return multiplier * ways;
}

function getSymbolCountInColumn(
  grid: number[][],
  col: number,
  targetSymbol: number,
  wildSymbolIndex?: number
): { count: number; positions: Array<{ row: number; col: number }> } {
  const rows = grid.length;
  let matchCount = 0;
  const positions: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < rows; row++) {
    const cellSymbol = grid[row]?.[col];
    if (cellSymbol === targetSymbol || cellSymbol === wildSymbolIndex) {
      matchCount++;
      positions.push({ row, col });
    }
  }

  return { count: matchCount, positions };
}

export const allWaysWinDetection: SlotImplementation<
  WinDetectionInput,
  WinDetectionOutput
> = {
  id: 'all_ways_win',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'winDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
   run: (_ctx, input) => {
     const wins: Win[] = [];
     const { grid, rows, cols, symbolCount, wildSymbolIndex, scatterSymbolIndex, payouts } = input;
     console.log('[allWaysWinDetection] Starting detection with symbolCount:', symbolCount, 'wildSymbolIndex:', wildSymbolIndex, 'scatterSymbolIndex:', scatterSymbolIndex);

     for (let symbol = 0; symbol < symbolCount; symbol++) {
       if (symbol === scatterSymbolIndex) {
         console.log('[allWaysWinDetection] Skipping scatter symbol:', symbol);
         continue;
       }

       let ways = 1;
       let positions: Array<{ row: number; col: number }> = [];
       let consecutiveReels = 0;

       for (let col = 0; col < cols; col++) {
         const { count, positions: colPositions } = getSymbolCountInColumn(
           grid,
           col,
           symbol,
           wildSymbolIndex
         );
         console.log('[allWaysWinDetection] Symbol', symbol, 'col', col, 'count:', count);

         if (count === 0) {
           console.log('[allWaysWinDetection] Symbol', symbol, 'broke at col', col);
           break;
         }

         ways *= count;
         positions = positions.concat(colPositions);
         consecutiveReels++;
       }

       if (consecutiveReels >= 3) {
         const payout = calculatePayoutForWin(symbol, consecutiveReels, ways, payouts);
         console.log('[allWaysWinDetection] Symbol', symbol, 'has', consecutiveReels, 'reels, ways:', ways, 'payout:', payout);
         if (payout > 0) {
           wins.push({
             symbol,
             count: consecutiveReels,
             ways,
             positions,
             payout,
           });
         }
       }
     }

     console.log('[allWaysWinDetection] Final wins:', JSON.stringify(wins));
     return wins;
   },
};

interface PayoutCalculationInput {
  wins: Win[];
  basePayout: number;
  betMultiplier: number;
}

type PayoutCalculationOutput = number;

export const standardPayoutCalculation: SlotImplementation<
  PayoutCalculationInput,
  PayoutCalculationOutput
> = {
  id: 'standard_payout',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'payoutCalculation' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    let totalPayout = 0;
    for (const win of input.wins) {
      totalPayout += win.payout;
    }
    return totalPayout * input.betMultiplier;
  },
};

interface BonusTriggerInput {
  grid: number[][];
  rows: number;
  cols: number;
  scatterSymbol: number;
  minScatters: number;
}

type BonusTriggerOutput = boolean;

export const scatterBonusTrigger: SlotImplementation<
  BonusTriggerInput,
  BonusTriggerOutput
> = {
  id: 'scatter_bonus',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'bonusTrigger' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    let scatterCount = 0;
    for (let row = 0; row < input.rows; row++) {
      for (let col = 0; col < input.cols; col++) {
        if (input.grid[row]?.[col] === input.scatterSymbol) {
          scatterCount++;
        }
      }
    }
    return scatterCount >= input.minScatters;
  },
};

interface FeedbackInput {
  event: 'win' | 'bonus' | 'spin_complete' | 'no_win';
  entityIds?: string[];
  data?: Record<string, unknown>;
}

interface FeedbackOutput {
  tagsToAdd?: Array<{ entityId: string; tag: string }>;
  tagsToRemove?: Array<{ entityId: string; tag: string }>;
}

export const tagFeedback: SlotImplementation<
  FeedbackInput,
  FeedbackOutput
> = {
  id: 'tag_feedback',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'feedback' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const result: FeedbackOutput = {};

    switch (input.event) {
      case 'win':
        if (input.entityIds) {
          result.tagsToAdd = input.entityIds.map((entityId) => ({
            entityId,
            tag: 'sys.slotMachine:win',
          }));
        }
        break;
      case 'bonus':
        if (input.entityIds) {
          result.tagsToAdd = input.entityIds.map((entityId) => ({
            entityId,
            tag: 'sys.slotMachine:bonus',
          }));
        }
        break;
      case 'no_win':
        if (input.entityIds) {
          result.tagsToAdd = input.entityIds.map((entityId) => ({
            entityId,
            tag: 'sys.slotMachine:no_win',
          }));
        }
        break;
    }

    return result;
  },
};

function registerIfNotExists(
  registry: ReturnType<typeof getGlobalSlotRegistry>,
  impl: SlotImplementation<unknown, unknown>
): void {
  if (!registry.has(impl.id)) {
    registry.register(impl);
  }
}

export function registerSlotMachineSlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, uniformWeighting as SlotImplementation);
  registerIfNotExists(registry, allWaysWinDetection as SlotImplementation);
  registerIfNotExists(registry, standardPayoutCalculation as SlotImplementation);
  registerIfNotExists(registry, scatterBonusTrigger as SlotImplementation);
  registerIfNotExists(registry, tagFeedback as SlotImplementation);
}
