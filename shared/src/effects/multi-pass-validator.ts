import type { MultiPassEffectSpec } from '../types/multi-pass-effect';

export interface MultiPassValidationError {
  code: MultiPassValidationErrorCode;
  message: string;
  passId?: string;
}

export type MultiPassValidationErrorCode =
  | 'E_NO_BUFFERS'
  | 'E_NO_PASSES'
  | 'E_MISSING_DISPLAY_BUFFER'
  | 'E_UNKNOWN_WRITE_BUFFER'
  | 'E_UNKNOWN_READ_BUFFER'
  | 'E_DUPLICATE_PASS_ID'
  | 'E_EMPTY_SHADER'
  | 'E_BUFFER_NO_WRITER';

export interface MultiPassValidationResult {
  valid: boolean;
  errors: MultiPassValidationError[];
}

function err(
  code: MultiPassValidationErrorCode,
  message: string,
  passId?: string,
): MultiPassValidationError {
  return { code, message, passId };
}

export function validateMultiPassSpec(spec: MultiPassEffectSpec): MultiPassValidationResult {
  const errors: MultiPassValidationError[] = [];

  const bufferNames = Object.keys(spec.buffers);
  if (bufferNames.length === 0) {
    errors.push(err('E_NO_BUFFERS', 'Spec must define at least one buffer'));
  }

  if (spec.passes.length === 0) {
    errors.push(err('E_NO_PASSES', 'Spec must define at least one pass'));
  }

  if (!spec.buffers[spec.displayBuffer]) {
    errors.push(
      err('E_MISSING_DISPLAY_BUFFER', `displayBuffer "${spec.displayBuffer}" is not a defined buffer`),
    );
  }

  const seenIds = new Set<string>();
  const writtenBuffers = new Set<string>();

  for (const pass of spec.passes) {
    if (seenIds.has(pass.id)) {
      errors.push(err('E_DUPLICATE_PASS_ID', `Duplicate pass id "${pass.id}"`, pass.id));
    }
    seenIds.add(pass.id);

    if (!pass.shader || pass.shader.trim() === '') {
      errors.push(err('E_EMPTY_SHADER', `Pass "${pass.id}" has empty shader`, pass.id));
    }

    if (!spec.buffers[pass.writes]) {
      errors.push(
        err('E_UNKNOWN_WRITE_BUFFER', `Pass "${pass.id}" writes to unknown buffer "${pass.writes}"`, pass.id),
      );
    }
    writtenBuffers.add(pass.writes);

    for (const [sampler, bufferName] of Object.entries(pass.reads)) {
      if (!spec.buffers[bufferName]) {
        errors.push(
          err(
            'E_UNKNOWN_READ_BUFFER',
            `Pass "${pass.id}" reads unknown buffer "${bufferName}" via sampler "${sampler}"`,
            pass.id,
          ),
        );
      }
    }
  }

  for (const name of bufferNames) {
    if (!writtenBuffers.has(name)) {
      errors.push(err('E_BUFFER_NO_WRITER', `Buffer "${name}" has no pass that writes to it`));
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface BufferReadResolution {
  samplerName: string;
  bufferName: string;
  sourcePassIndex: number;
  isFeedback: boolean;
}

export function resolveBufferReads(spec: MultiPassEffectSpec): BufferReadResolution[] {
  const bufferWriters: Record<string, number[]> = {};
  for (const name of Object.keys(spec.buffers)) {
    bufferWriters[name] = [];
  }
  for (let i = 0; i < spec.passes.length; i++) {
    const pass = spec.passes[i];
    if (bufferWriters[pass.writes]) {
      bufferWriters[pass.writes].push(i);
    }
  }

  const resolutions: BufferReadResolution[] = [];

  for (let passIndex = 0; passIndex < spec.passes.length; passIndex++) {
    const pass = spec.passes[passIndex];
    for (const [samplerName, bufferName] of Object.entries(pass.reads)) {
      const writers = bufferWriters[bufferName];
      if (!writers) continue;

      let bestEarlier = -1;
      let bestLater = -1;

      for (const writerIdx of writers) {
        if (writerIdx < passIndex) {
          if (bestEarlier === -1 || writerIdx > bestEarlier) {
            bestEarlier = writerIdx;
          }
        } else {
          if (bestLater === -1 || writerIdx > bestLater) {
            bestLater = writerIdx;
          }
        }
      }

      const sourceIdx = bestEarlier >= 0 ? bestEarlier : bestLater;
      if (sourceIdx >= 0) {
        resolutions.push({
          samplerName,
          bufferName,
          sourcePassIndex: sourceIdx,
          isFeedback: bestEarlier < 0,
        });
      }
    }
  }

  return resolutions;
}

export function needsEntitySeed(spec: MultiPassEffectSpec): string[] {
  return Object.entries(spec.buffers)
    .filter(([, buf]) => buf.initFrom === 'entity')
    .map(([name]) => name);
}

export function findSeedSamplers(
  spec: MultiPassEffectSpec,
): Array<{ passIndex: number; samplerName: string; bufferName: string }> {
  const bufferWriters: Record<string, number[]> = {};
  for (const name of Object.keys(spec.buffers)) {
    bufferWriters[name] = [];
  }
  for (let i = 0; i < spec.passes.length; i++) {
    if (bufferWriters[spec.passes[i].writes]) {
      bufferWriters[spec.passes[i].writes].push(i);
    }
  }

  const entityBuffers = needsEntitySeed(spec);
  const seeds: Array<{ passIndex: number; samplerName: string; bufferName: string }> = [];

  for (const bufferName of entityBuffers) {
    const writers = bufferWriters[bufferName] ?? [];

    for (let passIndex = 0; passIndex < spec.passes.length; passIndex++) {
      const pass = spec.passes[passIndex];
      for (const [samplerName, readBuf] of Object.entries(pass.reads)) {
        if (readBuf !== bufferName) continue;

        const hasEarlierWriter = writers.some((w) => w < passIndex);
        if (!hasEarlierWriter) {
          seeds.push({ passIndex, samplerName, bufferName });
        }
      }
    }
  }

  return seeds;
}

export function detectFeedbackLoops(
  spec: MultiPassEffectSpec,
): Array<{ passIndex: number; samplerNames: string[] }> {
  const resolutions = resolveBufferReads(spec);
  const feedbackByPass = new Map<number, string[]>();

  for (const r of resolutions) {
    if (r.sourcePassIndex === spec.passes.indexOf(spec.passes[r.sourcePassIndex])) {
      const passIndex = spec.passes.findIndex((p) =>
        Object.entries(p.reads).some(([s, b]) => s === r.samplerName && b === r.bufferName),
      );
      if (passIndex >= 0 && r.sourcePassIndex === passIndex) {
        const existing = feedbackByPass.get(passIndex) ?? [];
        existing.push(r.samplerName);
        feedbackByPass.set(passIndex, existing);
      }
    }
  }

  return Array.from(feedbackByPass.entries()).map(([passIndex, samplerNames]) => ({
    passIndex,
    samplerNames,
  }));
}
