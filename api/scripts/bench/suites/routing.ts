import type { BenchmarkSuite } from '../core/types';

export const ROUTING_CLASSIFIER_PROMPT = `Classify this user message into exactly one category based on what kind of AI model capability it needs.

Categories:
- SIMPLE: Quick answers, trivial edits, confirmations, factual lookups. A small fast model handles this fine.
- CODING: Needs to write/edit code, implement features, create game mechanics. Needs a good coding model.
- COMPLEX: Multi-step design, architecture, creative game design, system redesign. Needs a strong general model.
- REASONING: Mathematical proofs, formal logic, algorithm analysis, optimization theory. Needs a reasoning model.

Respond with ONLY the category name. Nothing else.`;

const CASES: Array<{ id: string; prompt: string; expectedTier: string; notes?: string }> = [
  { id: 'routing-01', prompt: 'What is this game about?', expectedTier: 'SIMPLE' },
  { id: 'routing-02', prompt: 'Change the background color to blue', expectedTier: 'SIMPLE' },
  { id: 'routing-03', prompt: 'How many levels does this game have?', expectedTier: 'SIMPLE' },
  { id: 'routing-04', prompt: 'Yes, that looks good', expectedTier: 'SIMPLE' },
  { id: 'routing-05', prompt: 'Make the player sprite bigger', expectedTier: 'SIMPLE' },
  { id: 'routing-06', prompt: 'Add a double-jump mechanic to the player character', expectedTier: 'CODING' },
  {
    id: 'routing-07',
    prompt: 'Create a scoring system that gives 10 points per coin and 50 points per enemy defeated',
    expectedTier: 'CODING',
  },
  {
    id: 'routing-08',
    prompt: 'Write a collision handler that destroys the bullet and damages the enemy when they overlap',
    expectedTier: 'CODING',
  },
  {
    id: 'routing-09',
    prompt: 'Add a particle effect that spawns when the player lands after a jump',
    expectedTier: 'CODING',
  },
  {
    id: 'routing-10',
    prompt: 'Implement a health bar UI that shows 3 hearts and removes one when the player takes damage',
    expectedTier: 'CODING',
  },
  {
    id: 'routing-11',
    prompt:
      'Design a complete level progression system with increasing difficulty, new enemy types per level, and a boss fight every 5 levels. Include a save/checkpoint mechanism.',
    expectedTier: 'COMPLEX',
  },
  {
    id: 'routing-12',
    prompt:
      'I want to completely rethink this game. Instead of a platformer, make it a top-down puzzle game where the player pushes blocks onto switches to open doors. Each level should teach a new mechanic.',
    expectedTier: 'COMPLEX',
  },
  {
    id: 'routing-13',
    prompt:
      'Build a multiplayer lobby system where players can create rooms, invite friends, and start a cooperative game session with synchronized physics',
    expectedTier: 'COMPLEX',
  },
  {
    id: 'routing-14',
    prompt:
      "Create an AI opponent that adapts to the player's skill level. It should play conservatively against beginners and aggressively against experienced players, learning from the match history.",
    expectedTier: 'COMPLEX',
  },
  {
    id: 'routing-15',
    prompt:
      'Redesign the entire game economy: add a shop, currency drops, item upgrades with diminishing returns, and a prestige system that resets progress for permanent bonuses',
    expectedTier: 'COMPLEX',
  },
  {
    id: 'routing-16',
    prompt:
      'The physics simulation is unstable when objects collide at high speed. Objects tunnel through walls. Derive the correct continuous collision detection formula and explain why our discrete step approach fails.',
    expectedTier: 'REASONING',
  },
  {
    id: 'routing-17',
    prompt:
      'I need an algorithm to procedurally generate solvable puzzle levels. Prove that every generated level has exactly one solution and the solver terminates in O(n²) time.',
    expectedTier: 'REASONING',
  },
  {
    id: 'routing-18',
    prompt:
      'Calculate the optimal spawn rate distribution so that the game feels challenging but fair. Model it as a Markov chain where player state transitions depend on enemy density.',
    expectedTier: 'REASONING',
  },
  {
    id: 'routing-19',
    prompt: 'Prove me wrong — I think a greedy algorithm is sufficient for our pathfinding. The enemies just need to get from A to B.',
    expectedTier: 'REASONING',
    notes: 'ClawRouter keyword matcher would wrongly trigger REASONING on prove alone - this tests semantic understanding',
  },
  {
    id: 'routing-20',
    prompt: "What's 2+2?",
    expectedTier: 'SIMPLE',
    notes: 'Trivial math - should not trigger REASONING despite being a math question',
  },
];

export const ROUTING_SUITE: BenchmarkSuite = {
  id: 'routing',
  taskType: 'routing',
  cases: CASES.map((c) => ({
    id: c.id,
    input: {
      prompt: c.prompt,
      expectedTier: c.expectedTier,
    },
    assertions: [],
    tags: c.notes ? ['edge_case'] : undefined,
  })),
};
