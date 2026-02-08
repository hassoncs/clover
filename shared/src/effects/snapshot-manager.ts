import type {
  SnapshotRequest,
  PipelineSnapshot,
  SnapshotValidationResult,
} from '../types/effect-snapshot';
import type { EffectPipelineSpec } from '../types/effect-pipeline';

export function createSnapshotRequest(
  pipelineId: string,
  passIds?: string[],
): SnapshotRequest {
  const request: SnapshotRequest = { pipelineId };
  if (passIds && passIds.length > 0) {
    request.passIds = passIds;
  }
  return request;
}

export function validateSnapshotForRestore(
  snapshot: PipelineSnapshot,
  currentSpec: EffectPipelineSpec,
): SnapshotValidationResult {
  const errors: string[] = [];

  const specPassIds = new Set<string>();
  for (const pass of currentSpec.spritePasses) {
    specPassIds.add(pass.id);
  }
  for (const pass of currentSpec.screenPasses) {
    specPassIds.add(pass.id);
  }

  if (specPassIds.size === 0) {
    errors.push('Current pipeline has no passes');
    return { valid: false, errors };
  }

  const snapshotPassIds = snapshot.passes.map((p) => p.passId);

  for (const passId of snapshotPassIds) {
    if (!specPassIds.has(passId)) {
      errors.push(`Snapshot pass "${passId}" not found in current pipeline`);
    }
  }

  if (snapshotPassIds.length === 0) {
    errors.push('Snapshot contains no passes');
  }

  const snapshotPassIdSet = new Set(snapshotPassIds);
  for (const specId of specPassIds) {
    if (!snapshotPassIdSet.has(specId)) {
      errors.push(`Pipeline pass "${specId}" missing from snapshot (will keep current state)`);
    }
  }

  const hasBlockingErrors = errors.some(
    (e) => !e.includes('missing from snapshot'),
  );

  return { valid: !hasBlockingErrors, errors };
}
