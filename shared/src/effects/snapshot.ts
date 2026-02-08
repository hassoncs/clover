import type { CompiledPlan } from './types';

// ---------------------------------------------------------------------------
// V2 Snapshot types
// ---------------------------------------------------------------------------

export interface FeedbackSnapshotState {
  currentReadIndex: 0 | 1;
  currentWriteIndex: 0 | 1;
  frameCount: number;
  frozen: boolean;
  initialized: boolean;
}

export interface EffectsSnapshot {
  planHash: string;
  graphId: string;
  graphVersion: string;
  passParams: Record<string, Record<string, unknown>>;
  feedbackStates: Record<string, FeedbackSnapshotState>;
  lifecycleState: string;
  timestamp: number;
  snapshotVersion: 1;
}

// ---------------------------------------------------------------------------
// Compatibility check types
// ---------------------------------------------------------------------------

export type SnapshotCompatibilityErrorCode =
  | 'E_HASH_MISMATCH'
  | 'E_VERSION_MISMATCH'
  | 'E_MISSING_PASS'
  | 'E_EXTRA_PASS'
  | 'E_MISSING_FEEDBACK'
  | 'E_SNAPSHOT_CORRUPT';

export interface SnapshotCompatibilityError {
  code: SnapshotCompatibilityErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface SnapshotCompatibility {
  compatible: boolean;
  errors: SnapshotCompatibilityError[];
}

// ---------------------------------------------------------------------------
// Restore result
// ---------------------------------------------------------------------------

type RestoreSuccess = {
  success: true;
  passParams: Record<string, Record<string, unknown>>;
  feedbackStates: Record<string, FeedbackSnapshotState>;
};

type RestoreFailure = {
  success: false;
  errors: SnapshotCompatibilityError[];
};

export type RestoreResult = RestoreSuccess | RestoreFailure;

// ---------------------------------------------------------------------------
// SnapshotManager
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class SnapshotManager {
  capture(
    plan: CompiledPlan,
    passParams: Record<string, Record<string, unknown>>,
    feedbackStates: Record<string, FeedbackSnapshotState>,
    lifecycleState: string,
  ): EffectsSnapshot {
    return {
      planHash: plan.hash,
      graphId: plan.graphId,
      graphVersion: plan.graphVersion,
      passParams: structuredClone(passParams),
      feedbackStates: structuredClone(feedbackStates),
      lifecycleState,
      timestamp: Date.now(),
      snapshotVersion: 1,
    };
  }

  checkCompatibility(
    snapshot: EffectsSnapshot,
    currentPlan: CompiledPlan,
  ): SnapshotCompatibility {
    if (!this.validate(snapshot)) {
      return {
        compatible: false,
        errors: [
          {
            code: 'E_SNAPSHOT_CORRUPT',
            message: 'Snapshot failed structural validation',
          },
        ],
      };
    }

    const errors: SnapshotCompatibilityError[] = [];

    if (snapshot.planHash !== currentPlan.hash) {
      errors.push({
        code: 'E_HASH_MISMATCH',
        message: `Plan hash mismatch: snapshot="${snapshot.planHash}" current="${currentPlan.hash}"`,
        details: {
          snapshotHash: snapshot.planHash,
          currentHash: currentPlan.hash,
        },
      });
    }

    if (snapshot.graphVersion !== currentPlan.graphVersion) {
      errors.push({
        code: 'E_VERSION_MISMATCH',
        message: `Graph version mismatch: snapshot="${snapshot.graphVersion}" current="${currentPlan.graphVersion}"`,
        details: {
          snapshotVersion: snapshot.graphVersion,
          currentVersion: currentPlan.graphVersion,
        },
      });
    }

    const currentPassIds = new Set(currentPlan.passes.map((p) => p.id));
    const snapshotPassIds = new Set(Object.keys(snapshot.passParams));

    for (const passId of snapshotPassIds) {
      if (!currentPassIds.has(passId)) {
        errors.push({
          code: 'E_MISSING_PASS',
          message: `Snapshot pass "${passId}" not found in current plan`,
          details: { passId },
        });
      }
    }

    for (const passId of currentPassIds) {
      if (!snapshotPassIds.has(passId)) {
        errors.push({
          code: 'E_EXTRA_PASS',
          message: `Current plan pass "${passId}" not found in snapshot`,
          details: { passId },
        });
      }
    }

    const currentFeedbackIds = new Set(
      Object.keys(currentPlan.feedbackPolicies),
    );
    for (const fbId of Object.keys(snapshot.feedbackStates)) {
      if (!currentFeedbackIds.has(fbId)) {
        errors.push({
          code: 'E_MISSING_FEEDBACK',
          message: `Snapshot feedback "${fbId}" not found in current plan feedbackPolicies`,
          details: { feedbackId: fbId },
        });
      }
    }

    return { compatible: errors.length === 0, errors };
  }

  restore(
    snapshot: EffectsSnapshot,
    currentPlan: CompiledPlan,
  ): RestoreResult {
    const compatibility = this.checkCompatibility(snapshot, currentPlan);
    if (!compatibility.compatible) {
      return { success: false, errors: compatibility.errors };
    }

    return {
      success: true,
      passParams: structuredClone(snapshot.passParams),
      feedbackStates: structuredClone(snapshot.feedbackStates),
    };
  }

  validate(snapshot: unknown): snapshot is EffectsSnapshot {
    if (!isRecord(snapshot)) return false;

    if (typeof snapshot.planHash !== 'string') return false;
    if (typeof snapshot.graphId !== 'string') return false;
    if (typeof snapshot.graphVersion !== 'string') return false;
    if (typeof snapshot.lifecycleState !== 'string') return false;
    if (typeof snapshot.timestamp !== 'number') return false;
    if (snapshot.snapshotVersion !== 1) return false;
    if (!isRecord(snapshot.passParams)) return false;
    if (!isRecord(snapshot.feedbackStates)) return false;

    return true;
  }
}
