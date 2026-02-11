/**
 * Test queries for routing spike evaluation.
 * Each has a human-labeled expected tier so we can measure accuracy.
 *
 * Tiers:
 *   SIMPLE  — quick factual Q&A, one-liners, trivial edits
 *   CODING  — file writes, code generation, game logic
 *   COMPLEX — multi-step design, architecture, creative game design
 *   REASONING — math, formal logic, algorithmic problem-solving
 */

export type Tier = 'SIMPLE' | 'CODING' | 'COMPLEX' | 'REASONING';

export interface TestQuery {
  id: number;
  prompt: string;
  expectedTier: Tier;
  notes?: string;
}

export const TEST_QUERIES: TestQuery[] = [
  // ── SIMPLE ──
  {
    id: 1,
    prompt: 'What is this game about?',
    expectedTier: 'SIMPLE',
  },
  {
    id: 2,
    prompt: 'Change the background color to blue',
    expectedTier: 'SIMPLE',
  },
  {
    id: 3,
    prompt: 'How many levels does this game have?',
    expectedTier: 'SIMPLE',
  },
  {
    id: 4,
    prompt: 'Yes, that looks good',
    expectedTier: 'SIMPLE',
  },
  {
    id: 5,
    prompt: 'Make the player sprite bigger',
    expectedTier: 'SIMPLE',
  },

  // ── CODING ──
  {
    id: 6,
    prompt: 'Add a double-jump mechanic to the player character',
    expectedTier: 'CODING',
  },
  {
    id: 7,
    prompt: 'Create a scoring system that gives 10 points per coin and 50 points per enemy defeated',
    expectedTier: 'CODING',
  },
  {
    id: 8,
    prompt: 'Write a collision handler that destroys the bullet and damages the enemy when they overlap',
    expectedTier: 'CODING',
  },
  {
    id: 9,
    prompt: 'Add a particle effect that spawns when the player lands after a jump',
    expectedTier: 'CODING',
  },
  {
    id: 10,
    prompt: 'Implement a health bar UI that shows 3 hearts and removes one when the player takes damage',
    expectedTier: 'CODING',
  },

  // ── COMPLEX ──
  {
    id: 11,
    prompt: 'Design a complete level progression system with increasing difficulty, new enemy types per level, and a boss fight every 5 levels. Include a save/checkpoint mechanism.',
    expectedTier: 'COMPLEX',
  },
  {
    id: 12,
    prompt: 'I want to completely rethink this game. Instead of a platformer, make it a top-down puzzle game where the player pushes blocks onto switches to open doors. Each level should teach a new mechanic.',
    expectedTier: 'COMPLEX',
  },
  {
    id: 13,
    prompt: 'Build a multiplayer lobby system where players can create rooms, invite friends, and start a cooperative game session with synchronized physics',
    expectedTier: 'COMPLEX',
  },
  {
    id: 14,
    prompt: 'Create an AI opponent that adapts to the player\'s skill level. It should play conservatively against beginners and aggressively against experienced players, learning from the match history.',
    expectedTier: 'COMPLEX',
  },
  {
    id: 15,
    prompt: 'Redesign the entire game economy: add a shop, currency drops, item upgrades with diminishing returns, and a prestige system that resets progress for permanent bonuses',
    expectedTier: 'COMPLEX',
  },

  // ── REASONING ──
  {
    id: 16,
    prompt: 'The physics simulation is unstable when objects collide at high speed. Objects tunnel through walls. Derive the correct continuous collision detection formula and explain why our discrete step approach fails.',
    expectedTier: 'REASONING',
  },
  {
    id: 17,
    prompt: 'I need an algorithm to procedurally generate solvable puzzle levels. Prove that every generated level has exactly one solution and the solver terminates in O(n²) time.',
    expectedTier: 'REASONING',
  },
  {
    id: 18,
    prompt: 'Calculate the optimal spawn rate distribution so that the game feels challenging but fair. Model it as a Markov chain where player state transitions depend on enemy density.',
    expectedTier: 'REASONING',
  },
  {
    id: 19,
    prompt: 'Prove me wrong — I think a greedy algorithm is sufficient for our pathfinding. The enemies just need to get from A to B.',
    expectedTier: 'REASONING',
    notes: 'ClawRouter keyword matcher would wrongly trigger REASONING on "prove" alone — this tests semantic understanding',
  },
  {
    id: 20,
    prompt: 'What\'s 2+2?',
    expectedTier: 'SIMPLE',
    notes: 'Trivial math — should NOT trigger REASONING despite being a "math" question',
  },
];

export const SYSTEM_PROMPT = `You are a helpful AI assistant collaborating with the user on a creative project. You and the user share a workspace with files that both of you can see.

You have tools: readFile and writeFile. The user sees file changes in real-time in a preview panel next to the chat.`;
