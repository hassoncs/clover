import { describe, it, expect } from 'vitest';
import {
  validateMultiPassSpec,
  resolveBufferReads,
  needsEntitySeed,
  findSeedSamplers,
  detectFeedbackLoops,
} from '../multi-pass-validator';
import type { MultiPassEffectSpec } from '../../types/multi-pass-effect';

function makeSpec(overrides: Partial<MultiPassEffectSpec> = {}): MultiPassEffectSpec {
  return {
    id: 'test',
    buffers: { out: { initFrom: 'clear' } },
    passes: [
      { id: 'fill', shader: 'shader_type canvas_item;\nvoid fragment(){ COLOR = vec4(1); }', reads: {}, writes: 'out' },
    ],
    displayBuffer: 'out',
    lifecycle: { autoStart: false, stopMode: 'freeze' },
    ...overrides,
  };
}

describe('validateMultiPassSpec', () => {
  it('accepts a valid minimal spec', () => {
    const result = validateMultiPassSpec(makeSpec());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects spec with no buffers', () => {
    const result = validateMultiPassSpec(makeSpec({ buffers: {} }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_NO_BUFFERS')).toBe(true);
  });

  it('rejects spec with no passes', () => {
    const result = validateMultiPassSpec(makeSpec({ passes: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_NO_PASSES')).toBe(true);
  });

  it('rejects spec with unknown displayBuffer', () => {
    const result = validateMultiPassSpec(makeSpec({ displayBuffer: 'missing' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_MISSING_DISPLAY_BUFFER')).toBe(true);
  });

  it('rejects pass that writes to unknown buffer', () => {
    const result = validateMultiPassSpec(
      makeSpec({
        passes: [{ id: 'p', shader: 'shader_type canvas_item;', reads: {}, writes: 'ghost' }],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_UNKNOWN_WRITE_BUFFER')).toBe(true);
  });

  it('rejects pass that reads unknown buffer', () => {
    const result = validateMultiPassSpec(
      makeSpec({
        passes: [
          { id: 'p', shader: 'shader_type canvas_item;', reads: { src: 'ghost' }, writes: 'out' },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_UNKNOWN_READ_BUFFER')).toBe(true);
  });

  it('rejects duplicate pass ids', () => {
    const result = validateMultiPassSpec(
      makeSpec({
        passes: [
          { id: 'dup', shader: 'shader_type canvas_item;', reads: {}, writes: 'out' },
          { id: 'dup', shader: 'shader_type canvas_item;', reads: {}, writes: 'out' },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_DUPLICATE_PASS_ID')).toBe(true);
  });

  it('rejects pass with empty shader', () => {
    const result = validateMultiPassSpec(
      makeSpec({
        passes: [{ id: 'p', shader: '', reads: {}, writes: 'out' }],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_EMPTY_SHADER')).toBe(true);
  });

  it('warns when a buffer has no writer', () => {
    const result = validateMultiPassSpec(
      makeSpec({
        buffers: { out: { initFrom: 'clear' }, unused: { initFrom: 'clear' } },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_BUFFER_NO_WRITER' && e.message.includes('unused'))).toBe(true);
  });

  it('validates the paint example blur spec', () => {
    const blurSpec: MultiPassEffectSpec = {
      id: 'simple-blur',
      buffers: { canvas: { initFrom: 'entity' } },
      passes: [
        {
          id: 'blur',
          shader: 'shader_type canvas_item;\nuniform sampler2D current_buffer;\nvoid fragment(){ COLOR = texture(current_buffer, UV); }',
          reads: { current_buffer: 'canvas' },
          writes: 'canvas',
        },
      ],
      displayBuffer: 'canvas',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };
    const result = validateMultiPassSpec(blurSpec);
    expect(result.valid).toBe(true);
  });

  it('validates two-buffer spec', () => {
    const spec: MultiPassEffectSpec = {
      id: 'two-buf',
      buffers: {
        a: { initFrom: 'entity' },
        b: { initFrom: 'clear' },
      },
      passes: [
        { id: 'copy-a-to-b', shader: 'shader_type canvas_item;', reads: { src: 'a' }, writes: 'b' },
        { id: 'tint-a', shader: 'shader_type canvas_item;', reads: { src: 'b' }, writes: 'a' },
      ],
      displayBuffer: 'b',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };
    const result = validateMultiPassSpec(spec);
    expect(result.valid).toBe(true);
  });
});

describe('resolveBufferReads', () => {
  it('resolves self-referencing single pass as feedback', () => {
    const spec = makeSpec({
      buffers: { canvas: { initFrom: 'entity' } },
      passes: [
        { id: 'blur', shader: 'shader', reads: { current_buffer: 'canvas' }, writes: 'canvas' },
      ],
      displayBuffer: 'canvas',
    });

    const resolutions = resolveBufferReads(spec);
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]).toEqual({
      samplerName: 'current_buffer',
      bufferName: 'canvas',
      sourcePassIndex: 0,
      isFeedback: true,
    });
  });

  it('resolves earlier writer as current-frame read', () => {
    const spec = makeSpec({
      buffers: {
        a: { initFrom: 'entity' },
        b: { initFrom: 'clear' },
      },
      passes: [
        { id: 'write-b', shader: 'shader', reads: { src: 'a' }, writes: 'b' },
        { id: 'read-b', shader: 'shader', reads: { src: 'b' }, writes: 'a' },
      ],
      displayBuffer: 'a',
    });

    const resolutions = resolveBufferReads(spec);
    const readB = resolutions.find((r) => r.samplerName === 'src' && r.bufferName === 'b');
    expect(readB).toBeDefined();
    expect(readB!.sourcePassIndex).toBe(0);
    expect(readB!.isFeedback).toBe(false);
  });

  it('resolves later writer as feedback when no earlier writer', () => {
    const spec = makeSpec({
      buffers: {
        a: { initFrom: 'entity' },
        b: { initFrom: 'clear' },
      },
      passes: [
        { id: 'read-a', shader: 'shader', reads: { src: 'a' }, writes: 'b' },
        { id: 'write-a', shader: 'shader', reads: { src: 'b' }, writes: 'a' },
      ],
      displayBuffer: 'b',
    });

    const resolutions = resolveBufferReads(spec);
    const readA = resolutions.find((r) => r.samplerName === 'src' && r.bufferName === 'a');
    expect(readA).toBeDefined();
    expect(readA!.sourcePassIndex).toBe(1);
    expect(readA!.isFeedback).toBe(true);
  });

  it('prefers closest earlier writer', () => {
    const spec = makeSpec({
      buffers: { buf: { initFrom: 'clear' } },
      passes: [
        { id: 'p0', shader: 'shader', reads: {}, writes: 'buf' },
        { id: 'p1', shader: 'shader', reads: {}, writes: 'buf' },
        { id: 'p2', shader: 'shader', reads: { src: 'buf' }, writes: 'buf' },
      ],
      displayBuffer: 'buf',
    });

    const resolutions = resolveBufferReads(spec);
    const read = resolutions.find((r) => r.samplerName === 'src');
    expect(read).toBeDefined();
    expect(read!.sourcePassIndex).toBe(1);
    expect(read!.isFeedback).toBe(false);
  });

  it('handles pass with no reads', () => {
    const spec = makeSpec();
    const resolutions = resolveBufferReads(spec);
    expect(resolutions).toHaveLength(0);
  });
});

describe('needsEntitySeed', () => {
  it('returns buffers with initFrom entity', () => {
    const spec = makeSpec({
      buffers: {
        a: { initFrom: 'entity' },
        b: { initFrom: 'clear' },
        c: { initFrom: 'entity' },
      },
      passes: [
        { id: 'p1', shader: 'shader', reads: {}, writes: 'a' },
        { id: 'p2', shader: 'shader', reads: {}, writes: 'b' },
        { id: 'p3', shader: 'shader', reads: {}, writes: 'c' },
      ],
      displayBuffer: 'a',
    });
    const result = needsEntitySeed(spec);
    expect(result).toEqual(['a', 'c']);
  });

  it('returns empty for all-clear buffers', () => {
    const result = needsEntitySeed(makeSpec());
    expect(result).toEqual([]);
  });
});

describe('findSeedSamplers', () => {
  it('finds seed sampler for self-referencing blur pass', () => {
    const spec: MultiPassEffectSpec = {
      id: 'blur',
      buffers: { canvas: { initFrom: 'entity' } },
      passes: [
        { id: 'blur', shader: 'shader', reads: { current_buffer: 'canvas' }, writes: 'canvas' },
      ],
      displayBuffer: 'canvas',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };

    const seeds = findSeedSamplers(spec);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({
      passIndex: 0,
      samplerName: 'current_buffer',
      bufferName: 'canvas',
    });
  });

  it('does not seed when an earlier pass writes the buffer', () => {
    const spec: MultiPassEffectSpec = {
      id: 'two-pass',
      buffers: { buf: { initFrom: 'entity' } },
      passes: [
        { id: 'write', shader: 'shader', reads: {}, writes: 'buf' },
        { id: 'read', shader: 'shader', reads: { src: 'buf' }, writes: 'buf' },
      ],
      displayBuffer: 'buf',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };

    const seeds = findSeedSamplers(spec);
    expect(seeds).toHaveLength(0);
  });

  it('seeds the first pass reading an entity buffer with no earlier writer', () => {
    const spec: MultiPassEffectSpec = {
      id: 'copy',
      buffers: {
        a: { initFrom: 'entity' },
        b: { initFrom: 'clear' },
      },
      passes: [
        { id: 'a-to-b', shader: 'shader', reads: { src: 'a' }, writes: 'b' },
        { id: 'tint', shader: 'shader', reads: { src: 'b' }, writes: 'b' },
      ],
      displayBuffer: 'b',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };

    const seeds = findSeedSamplers(spec);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({
      passIndex: 0,
      samplerName: 'src',
      bufferName: 'a',
    });
  });

  it('returns empty when no buffers use entity init', () => {
    const seeds = findSeedSamplers(makeSpec());
    expect(seeds).toHaveLength(0);
  });
});

describe('detectFeedbackLoops', () => {
  it('detects self-referencing single pass as needing ping-pong', () => {
    const spec: MultiPassEffectSpec = {
      id: 'blur',
      buffers: { canvas: { initFrom: 'entity' } },
      passes: [
        { id: 'blur', shader: 'shader', reads: { current_buffer: 'canvas' }, writes: 'canvas' },
      ],
      displayBuffer: 'canvas',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };
    const loops = detectFeedbackLoops(spec);
    expect(loops).toHaveLength(1);
    expect(loops[0].passIndex).toBe(0);
    expect(loops[0].samplerNames).toEqual(['current_buffer']);
  });

  it('does not flag cross-buffer reads as feedback', () => {
    const spec: MultiPassEffectSpec = {
      id: 'cross',
      buffers: { a: { initFrom: 'entity' }, b: { initFrom: 'clear' } },
      passes: [
        { id: 'a-to-b', shader: 'shader', reads: { src: 'a' }, writes: 'b' },
        { id: 'b-to-a', shader: 'shader', reads: { src: 'b' }, writes: 'a' },
      ],
      displayBuffer: 'b',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };
    const loops = detectFeedbackLoops(spec);
    expect(loops).toHaveLength(0);
  });

  it('does not flag pass reading from an earlier writer', () => {
    const spec: MultiPassEffectSpec = {
      id: 'chain',
      buffers: { buf: { initFrom: 'clear' } },
      passes: [
        { id: 'write', shader: 'shader', reads: {}, writes: 'buf' },
        { id: 'read', shader: 'shader', reads: { src: 'buf' }, writes: 'buf' },
      ],
      displayBuffer: 'buf',
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };
    const loops = detectFeedbackLoops(spec);
    expect(loops).toHaveLength(0);
  });

  it('returns empty for pass with no reads', () => {
    const loops = detectFeedbackLoops(makeSpec());
    expect(loops).toHaveLength(0);
  });
});
