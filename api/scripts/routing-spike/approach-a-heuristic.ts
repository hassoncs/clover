import type { Tier } from './test-queries';

export interface HeuristicResult {
  tier: Tier;
  confidence: number;
  signals: string[];
}

const CODE_PATTERNS = [
  /```/,
  /\bfunction\b/i,
  /\bclass\b/i,
  /\bimport\b/i,
  /\basync\b/i,
  /\bconst\b/i,
  /\breturn\b/i,
  /\bif\s*\(/i,
  /\bfor\s*\(/i,
];

const CODING_VERBS = [
  'implement', 'create', 'add', 'build', 'write',
  'handler', 'collision', 'mechanic', 'system', 'spawn',
  'particle', 'effect', 'scoring', 'health bar', 'ui',
];

const COMPLEX_SIGNALS = [
  'redesign', 'rethink', 'complete', 'entire', 'multiplayer',
  'progression', 'economy', 'prestige', 'adaptive', 'ai opponent',
  'cooperative', 'synchronized', 'diminishing returns',
];

const REASONING_SIGNALS = [
  'prove', 'derive', 'formula', 'theorem', 'algorithm',
  'o(n', 'markov', 'optimal', 'calculate', 'continuous collision',
  'procedurally generate', 'solvable',
];

const SIMPLE_SIGNALS = [
  'what is', 'how many', 'yes', 'no', 'change the', 'make the',
  'looks good', 'thanks', 'ok',
];

function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  return patterns.filter(p => lower.includes(p)).length;
}

function sigmoid(x: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * x));
}

export function classifyHeuristic(prompt: string, _systemPrompt?: string): HeuristicResult {
  const text = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).length;
  const signals: string[] = [];

  const codePatternHits = CODE_PATTERNS.filter(p => p.test(prompt)).length;
  const codingVerbHits = countMatches(text, CODING_VERBS);
  const complexHits = countMatches(text, COMPLEX_SIGNALS);
  const reasoningHits = countMatches(text, REASONING_SIGNALS);
  const simpleHits = countMatches(text, SIMPLE_SIGNALS);

  if (codePatternHits > 0) signals.push(`code-patterns:${codePatternHits}`);
  if (codingVerbHits > 0) signals.push(`coding-verbs:${codingVerbHits}`);
  if (complexHits > 0) signals.push(`complex:${complexHits}`);
  if (reasoningHits > 0) signals.push(`reasoning:${reasoningHits}`);
  if (simpleHits > 0) signals.push(`simple:${simpleHits}`);
  signals.push(`words:${wordCount}`);

  if (reasoningHits >= 2) {
    return { tier: 'REASONING', confidence: sigmoid(reasoningHits - 1, 3), signals };
  }

  if (complexHits >= 2 || wordCount > 80) {
    return { tier: 'COMPLEX', confidence: sigmoid(complexHits + (wordCount > 80 ? 1 : 0) - 1, 2), signals };
  }

  if (codingVerbHits >= 1 || codePatternHits >= 1) {
    const score = codingVerbHits + codePatternHits;
    return { tier: 'CODING', confidence: sigmoid(score - 0.5, 2.5), signals };
  }

  if (simpleHits >= 1 || wordCount < 10) {
    return { tier: 'SIMPLE', confidence: sigmoid(simpleHits + (wordCount < 10 ? 1 : 0), 2), signals };
  }

  return { tier: 'CODING', confidence: 0.5, signals: [...signals, 'ambiguous->CODING'] };
}
