import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'memory';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

export const MEMORY_SLOT_CONTRACTS: Record<string, SlotContract> = {
  cardFlipping: {
    name: 'cardFlipping',
    kind: 'policy',
    description: 'How cards flip (single reveal, double reveal)',
  },
  matchLogic: {
    name: 'matchLogic',
    kind: 'pure',
    description: 'What constitutes a match (pair, triple, symbol)',
  },
  cardShuffler: {
    name: 'cardShuffler',
    kind: 'pure',
    description: 'Distribution algorithm for card placement',
  },
  timerRule: {
    name: 'timerRule',
    kind: 'policy',
    description: 'Time limits and penalties',
  },
};

interface Card {
  id: string;
  symbol: number;
  isFlipped: boolean;
  isMatched: boolean;
  position: { row: number; col: number };
}

interface CardFlippingInput {
  cardId: string;
  cards: Card[];
  currentlyFlipped: string[];
  maxFlipped: number;
}

interface CardFlippingOutput {
  shouldFlip: boolean;
  cardsToFlipBack: string[];
  checkForMatch: boolean;
}

export const twoCardFlip: SlotImplementation<CardFlippingInput, CardFlippingOutput> = {
  id: 'two_card_flip',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'cardFlipping' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { cardId, cards, currentlyFlipped } = input;
    const card = cards.find((c) => c.id === cardId);

    if (!card || card.isFlipped || card.isMatched) {
      return { shouldFlip: false, cardsToFlipBack: [], checkForMatch: false };
    }

    if (currentlyFlipped.length >= 2) {
      return {
        shouldFlip: true,
        cardsToFlipBack: currentlyFlipped,
        checkForMatch: false,
      };
    }

    if (currentlyFlipped.length === 1) {
      return {
        shouldFlip: true,
        cardsToFlipBack: [],
        checkForMatch: true,
      };
    }

    return { shouldFlip: true, cardsToFlipBack: [], checkForMatch: false };
  },
};

export const oneCardFlip: SlotImplementation<CardFlippingInput, CardFlippingOutput> = {
  id: 'one_card_flip',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'cardFlipping' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { cardId, cards, currentlyFlipped } = input;
    const card = cards.find((c) => c.id === cardId);

    if (!card || card.isFlipped || card.isMatched) {
      return { shouldFlip: false, cardsToFlipBack: [], checkForMatch: false };
    }

    if (currentlyFlipped.length >= 1) {
      return {
        shouldFlip: true,
        cardsToFlipBack: currentlyFlipped,
        checkForMatch: true,
      };
    }

    return { shouldFlip: true, cardsToFlipBack: [], checkForMatch: false };
  },
};

interface MatchLogicInput {
  flippedCardIds: string[];
  cards: Card[];
  requiredMatches: number;
}

interface MatchLogicOutput {
  isMatch: boolean;
  matchedCardIds: string[];
  score: number;
}

export const pairMatch: SlotImplementation<MatchLogicInput, MatchLogicOutput> = {
  id: 'pair_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchLogic' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { flippedCardIds, cards } = input;

    if (flippedCardIds.length < 2) {
      return { isMatch: false, matchedCardIds: [], score: 0 };
    }

    const flippedCards = flippedCardIds
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined);

    if (flippedCards.length < 2) {
      return { isMatch: false, matchedCardIds: [], score: 0 };
    }

    const [cardA, cardB] = flippedCards;
    if (cardA.symbol === cardB.symbol) {
      return {
        isMatch: true,
        matchedCardIds: [cardA.id, cardB.id],
        score: 100,
      };
    }

    return { isMatch: false, matchedCardIds: [], score: 0 };
  },
};

export const tripleMatch: SlotImplementation<MatchLogicInput, MatchLogicOutput> = {
  id: 'triple_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchLogic' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { flippedCardIds, cards } = input;

    if (flippedCardIds.length < 3) {
      return { isMatch: false, matchedCardIds: [], score: 0 };
    }

    const flippedCards = flippedCardIds
      .map((id) => cards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined);

    if (flippedCards.length < 3) {
      return { isMatch: false, matchedCardIds: [], score: 0 };
    }

    const [cardA, cardB, cardC] = flippedCards;
    if (cardA.symbol === cardB.symbol && cardB.symbol === cardC.symbol) {
      return {
        isMatch: true,
        matchedCardIds: [cardA.id, cardB.id, cardC.id],
        score: 200,
      };
    }

    return { isMatch: false, matchedCardIds: [], score: 0 };
  },
};

interface CardShufflerInput {
  symbols: number[];
  rows: number;
  cols: number;
  seed?: number;
}

interface CardShufflerOutput {
  layout: Array<{ row: number; col: number; symbol: number }>;
}

export const fisherYatesShuffle: SlotImplementation<CardShufflerInput, CardShufflerOutput> = {
  id: 'fisher_yates_shuffle',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'cardShuffler' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { symbols, rows, cols } = input;
    const shuffled = [...symbols];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const layout: Array<{ row: number; col: number; symbol: number }> = [];
    let index = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (index < shuffled.length) {
          layout.push({ row, col, symbol: shuffled[index] });
          index++;
        }
      }
    }

    return { layout };
  },
};

export const clusteredShuffle: SlotImplementation<CardShufflerInput, CardShufflerOutput> = {
  id: 'clustered_shuffle',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'cardShuffler' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { symbols, rows, cols } = input;

    const symbolGroups = new Map<number, number[]>();
    symbols.forEach((symbol, idx) => {
      if (!symbolGroups.has(symbol)) {
        symbolGroups.set(symbol, []);
      }
      symbolGroups.get(symbol)!.push(idx);
    });

    const layout: Array<{ row: number; col: number; symbol: number }> = [];
    const positions: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        positions.push({ row, col });
      }
    }

    let posIndex = 0;
    const groupEntries = Array.from(symbolGroups.entries());

    for (let i = groupEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupEntries[i], groupEntries[j]] = [groupEntries[j], groupEntries[i]];
    }

    for (const [symbol, indices] of groupEntries) {
      for (let i = 0; i < indices.length && posIndex < positions.length; i++) {
        const pos = positions[posIndex];
        layout.push({ row: pos.row, col: pos.col, symbol });
        posIndex++;
      }
    }

    return { layout };
  },
};

interface TimerRuleInput {
  elapsedTime: number;
  timeLimit: number;
  wrongMatches: number;
  penaltyPerWrong: number;
}

interface TimerRuleOutput {
  remainingTime: number;
  isTimeUp: boolean;
  displayTime: number;
}

export const noTimer: SlotImplementation<TimerRuleInput, TimerRuleOutput> = {
  id: 'no_timer',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'timerRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, _input) => {
    return {
      remainingTime: Infinity,
      isTimeUp: false,
      displayTime: 0,
    };
  },
};

export const countdownTimer: SlotImplementation<TimerRuleInput, TimerRuleOutput> = {
  id: 'countdown_timer',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'timerRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { elapsedTime, timeLimit } = input;
    const remainingTime = Math.max(0, timeLimit - elapsedTime);

    return {
      remainingTime,
      isTimeUp: remainingTime <= 0,
      displayTime: remainingTime,
    };
  },
};

export const penaltyTimer: SlotImplementation<TimerRuleInput, TimerRuleOutput> = {
  id: 'penalty_timer',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'timerRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { elapsedTime, timeLimit, wrongMatches, penaltyPerWrong } = input;
    const totalPenalty = wrongMatches * penaltyPerWrong;
    const effectiveElapsed = elapsedTime + totalPenalty;
    const remainingTime = Math.max(0, timeLimit - effectiveElapsed);

    return {
      remainingTime,
      isTimeUp: remainingTime <= 0,
      displayTime: remainingTime,
    };
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

export function registerMemorySlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, twoCardFlip as SlotImplementation);
  registerIfNotExists(registry, oneCardFlip as SlotImplementation);
  registerIfNotExists(registry, pairMatch as SlotImplementation);
  registerIfNotExists(registry, tripleMatch as SlotImplementation);
  registerIfNotExists(registry, fisherYatesShuffle as SlotImplementation);
  registerIfNotExists(registry, clusteredShuffle as SlotImplementation);
  registerIfNotExists(registry, noTimer as SlotImplementation);
  registerIfNotExists(registry, countdownTimer as SlotImplementation);
  registerIfNotExists(registry, penaltyTimer as SlotImplementation);
}
