import type { EffectPassSpec, EffectPipelineSpec, QualityTier } from '../types/effect-pipeline';
import type {
  BudgetPolicy,
  BudgetResolution,
  DegradationAction,
} from '../types/effect-budget';

const QUALITY_TIER_PRIORITY: Record<QualityTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function cloneSpec(spec: EffectPipelineSpec): EffectPipelineSpec {
  return {
    ...spec,
    spritePasses: spec.spritePasses.map((p) => ({ ...p })),
    screenPasses: spec.screenPasses.map((p) => ({ ...p })),
    lifecycle: { ...spec.lifecycle },
  };
}

function countTotalPasses(spec: EffectPipelineSpec): number {
  return spec.spritePasses.length + spec.screenPasses.length;
}

function collectDropCandidates(spec: EffectPipelineSpec): EffectPassSpec[] {
  const optional = [
    ...spec.spritePasses.filter((p) => !p.required),
    ...spec.screenPasses.filter((p) => !p.required),
  ];

  optional.sort((a, b) => {
    const tierDiff = QUALITY_TIER_PRIORITY[a.qualityTier] - QUALITY_TIER_PRIORITY[b.qualityTier];
    if (tierDiff !== 0) return tierDiff;
    return a.id.localeCompare(b.id);
  });

  return optional;
}

function removePass(spec: EffectPipelineSpec, passId: string): void {
  spec.spritePasses = spec.spritePasses.filter((p) => p.id !== passId);
  spec.screenPasses = spec.screenPasses.filter((p) => p.id !== passId);
}

export function resolveBudget(
  spec: EffectPipelineSpec,
  policy: BudgetPolicy,
): BudgetResolution {
  const actions: DegradationAction[] = [];
  const result = cloneSpec(spec);
  const { limits } = policy;

  if (limits.maxResolutionScale < 1.0) {
    actions.push({
      type: 'scale_resolution',
      from: 1.0,
      to: limits.maxResolutionScale,
      reason: `Policy ${policy.tier} caps resolution at ${limits.maxResolutionScale}`,
    });
  }

  if (limits.minCadence > 1) {
    actions.push({
      type: 'reduce_cadence',
      from: 1,
      to: limits.minCadence,
      reason: `Policy ${policy.tier} sets cadence to every ${limits.minCadence} frames`,
    });
  }

  const dropCandidates = collectDropCandidates(result);
  let candidateIdx = 0;

  while (countTotalPasses(result) > limits.maxPasses && candidateIdx < dropCandidates.length) {
    const candidate = dropCandidates[candidateIdx];
    removePass(result, candidate.id);
    actions.push({
      type: 'drop_pass',
      passId: candidate.id,
      qualityTier: candidate.qualityTier,
      reason: `Pass "${candidate.id}" (${candidate.qualityTier}) dropped to meet ${limits.maxPasses}-pass limit`,
    });
    candidateIdx++;
  }

  const withinBudget = countTotalPasses(result) <= limits.maxPasses;

  return { actions, resultSpec: result, withinBudget };
}
