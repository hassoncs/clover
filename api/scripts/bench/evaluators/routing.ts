import type { Evaluator, RunContext } from '../core/types';

const TIERS = ['SIMPLE', 'CODING', 'COMPLEX', 'REASONING'] as const;
type Tier = (typeof TIERS)[number];

function parseTier(content: string): Tier | undefined {
  const upper = content.trim().toUpperCase();
  for (const tier of TIERS) {
    if (upper === tier || upper.includes(tier)) {
      return tier;
    }
  }
  return undefined;
}

function readExpectedTier(ctx: RunContext): Tier | undefined {
  const expected = ctx.case_.input.expectedTier;
  if (typeof expected !== 'string') {
    return undefined;
  }
  const upper = expected.toUpperCase();
  return TIERS.includes(upper as Tier) ? (upper as Tier) : undefined;
}

export function createRoutingEvaluator(): Evaluator {
  return {
    id: 'routing',
    evaluate(ctx, results) {
      const expectedTier = readExpectedTier(ctx);
      const content = results[0]?.content ?? '';
      const actualTier = parseTier(content);

      if (!expectedTier) {
        return {
          pass: false,
          checks: [
            {
              id: 'tier-missing-expected',
              pass: false,
              message: 'case input.expectedTier is missing or invalid',
            },
          ],
        };
      }

      const pass = actualTier === expectedTier;
      return {
        pass,
        checks: [
          {
            id: 'tier-match',
            pass,
            message: pass ? undefined : `expected ${expectedTier}, got ${actualTier ?? 'UNKNOWN'}`,
            value: {
              expectedTier,
              actualTier: actualTier ?? 'UNKNOWN',
              response: content,
            },
          },
        ],
        scores: {
          accuracy: pass ? 1 : 0,
        },
      };
    },
  };
}
