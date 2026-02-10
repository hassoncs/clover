import { describe, it, expect } from 'vitest';
import type { EffectGraphSpec, EffectNode, Connection, FeedbackEdge } from '../types';
import {
  buildResourceGraph,
  areFormatsCompatible,
  areResolutionsCompatible,
  resolveEffectiveResolution,
} from '../resources';

function makeNode(overrides: Partial<EffectNode> & { id: string }): EffectNode {
  return {
    type: 'filter.blur.gaussian',
    family: 'filter',
    inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: null }],
    params: { radius: 5 },
    outputTarget: {
      bufferId: 'buf-0',
      format: 'rgba8',
      resolution: 'full',
    },
    flags: { stateful: false, fusible: 'always' },
    ...overrides,
  };
}

function makeSpec(overrides: Partial<EffectGraphSpec>): EffectGraphSpec {
  return {
    id: 'test-graph',
    version: '1.0.0',
    engineApiVersion: '1.0.0',
    scope: 'screen',
    nodes: [],
    connections: [],
    feedbackEdges: [],
    lifecycle: { autoStart: false, stopMode: 'freeze' },
    ...overrides,
  };
}

describe('areFormatsCompatible', () => {
  it('rgba8 -> rgba8 is compatible', () => {
    expect(areFormatsCompatible('rgba8', 'rgba8')).toBe(true);
  });

  it('rgba16f -> rgba16f is compatible', () => {
    expect(areFormatsCompatible('rgba16f', 'rgba16f')).toBe(true);
  });

  it('rgba16f -> rgba8 is compatible (downcast)', () => {
    expect(areFormatsCompatible('rgba16f', 'rgba8')).toBe(true);
  });

  it('rgba8 -> rgba16f is NOT compatible (upcast)', () => {
    expect(areFormatsCompatible('rgba8', 'rgba16f')).toBe(false);
  });
});

describe('areResolutionsCompatible', () => {
  it('same resolution modes are compatible', () => {
    expect(areResolutionsCompatible('full', 'full')).toBe(true);
    expect(areResolutionsCompatible('half', 'half')).toBe(true);
    expect(areResolutionsCompatible('quarter', 'quarter')).toBe(true);
    expect(areResolutionsCompatible('custom', 'custom')).toBe(true);
  });

  it('full -> half is compatible (downscale)', () => {
    expect(areResolutionsCompatible('full', 'half')).toBe(true);
  });

  it('full -> quarter is compatible (downscale)', () => {
    expect(areResolutionsCompatible('full', 'quarter')).toBe(true);
  });

  it('half -> quarter is compatible (downscale)', () => {
    expect(areResolutionsCompatible('half', 'quarter')).toBe(true);
  });

  it('half -> full is NOT compatible (upscale)', () => {
    expect(areResolutionsCompatible('half', 'full')).toBe(false);
  });

  it('quarter -> full is NOT compatible (upscale)', () => {
    expect(areResolutionsCompatible('quarter', 'full')).toBe(false);
  });

  it('custom is only compatible with custom', () => {
    expect(areResolutionsCompatible('custom', 'full')).toBe(false);
    expect(areResolutionsCompatible('full', 'custom')).toBe(false);
    expect(areResolutionsCompatible('custom', 'half')).toBe(false);
  });
});

describe('resolveEffectiveResolution', () => {
  it('full returns 1.0 scale', () => {
    expect(resolveEffectiveResolution('full')).toEqual({ widthScale: 1.0, heightScale: 1.0 });
  });

  it('half returns 0.5 scale', () => {
    expect(resolveEffectiveResolution('half')).toEqual({ widthScale: 0.5, heightScale: 0.5 });
  });

  it('quarter returns 0.25 scale', () => {
    expect(resolveEffectiveResolution('quarter')).toEqual({ widthScale: 0.25, heightScale: 0.25 });
  });

  it('custom returns provided dimensions', () => {
    expect(resolveEffectiveResolution('custom', 800, 600)).toEqual({
      widthScale: 800,
      heightScale: 600,
    });
  });

  it('custom defaults to 1.0 when no dimensions provided', () => {
    expect(resolveEffectiveResolution('custom')).toEqual({ widthScale: 1.0, heightScale: 1.0 });
  });
});

describe('buildResourceGraph', () => {
  it('builds a resource graph for a simple 2-node screen-scope graph', () => {
    const nodeA = makeNode({
      id: 'blur',
      inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: null }],
      outputTarget: { bufferId: 'buf-blur', format: 'rgba8', resolution: 'full' },
    });
    const nodeB = makeNode({
      id: 'bloom',
      inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: { nodeId: 'blur', output: 'buf-blur' } }],
      outputTarget: { bufferId: 'buf-bloom', format: 'rgba8', resolution: 'full' },
    });
    const connection: Connection = {
      from: { nodeId: 'blur', output: 'buf-blur' },
      to: { nodeId: 'bloom', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA, nodeB], connections: [connection] }),
    );

    expect(result.success).toBe(true);
    expect(result.graph).toBeDefined();
    expect(result.graph!.scope).toEqual({ type: 'screen' });
    expect(result.graph!.resources.size).toBe(3);
    expect(result.graph!.resources.has('__screenColor')).toBe(true);
    expect(result.graph!.resources.has('blur:buf-blur')).toBe(true);
    expect(result.graph!.resources.has('bloom:buf-bloom')).toBe(true);

    const blurRes = result.graph!.resources.get('blur:buf-blur')!;
    expect(blurRes.kind).toBe('intermediate');
    expect(blurRes.providedBy).toBe('blur');
    expect(blurRes.consumedBy).toContain('bloom');
  });

  it('builds a resource graph for entity-scope graph', () => {
    const nodeA = makeNode({
      id: 'tint',
      outputTarget: { bufferId: 'buf-tint', format: 'rgba8', resolution: 'full' },
    });

    const result = buildResourceGraph(makeSpec({ scope: 'entity', nodes: [nodeA] }));

    expect(result.success).toBe(true);
    expect(result.graph!.scope).toEqual({ type: 'entity', entityId: '' });
    expect(result.graph!.resources.has('__entityTexture')).toBe(true);
    expect(result.graph!.resources.get('__entityTexture')!.kind).toBe('entityTexture');
  });

  it('builds a resource graph with feedback resource', () => {
    const nodeA = makeNode({
      id: 'trail',
      inputSlots: [
        { name: 'previous', dataType: 'texture', connectedTo: null },
      ],
      outputTarget: { bufferId: 'buf-trail', format: 'rgba16f', resolution: 'full' },
      flags: { stateful: true, fusible: 'never' },
    });
    const feedback: FeedbackEdge = {
      from: { nodeId: 'trail', output: 'buf-trail' },
      to: { nodeId: 'trail', input: 'previous' },
      policy: {
        initMode: 'clear',
        clearColor: '#000000',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba16f',
      },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA], feedbackEdges: [feedback] }),
    );

    expect(result.success).toBe(true);
    const fbResId = '__feedback:trail->trail';
    expect(result.graph!.resources.has(fbResId)).toBe(true);
    const fbRes = result.graph!.resources.get(fbResId)!;
    expect(fbRes.kind).toBe('feedback');
    expect(fbRes.format).toBe('rgba16f');
    expect(fbRes.providedBy).toBe('trail');
    expect(fbRes.consumedBy).toContain('trail');
  });

  it('creates screenColor resource automatically for screen scope', () => {
    const result = buildResourceGraph(makeSpec({ scope: 'screen', nodes: [] }));

    expect(result.success).toBe(true);
    expect(result.graph!.resources.has('__screenColor')).toBe(true);
    const screenRes = result.graph!.resources.get('__screenColor')!;
    expect(screenRes.kind).toBe('screenColor');
    expect(screenRes.format).toBe('rgba8');
    expect(screenRes.resolution).toBe('full');
    expect(screenRes.providedBy).toBeNull();
  });

  it('creates entityTexture resource automatically for entity scope', () => {
    const result = buildResourceGraph(makeSpec({ scope: 'entity', nodes: [] }));

    expect(result.success).toBe(true);
    expect(result.graph!.resources.has('__entityTexture')).toBe(true);
    const entityRes = result.graph!.resources.get('__entityTexture')!;
    expect(entityRes.kind).toBe('entityTexture');
    expect(entityRes.format).toBe('rgba8');
    expect(entityRes.resolution).toBe('full');
    expect(entityRes.providedBy).toBeNull();
  });

  it('returns E_RESOURCE_UNRESOLVED when input connects to non-existent output', () => {
    const nodeA = makeNode({
      id: 'blur',
      inputSlots: [
        { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'missing', output: 'buf-x' } },
      ],
    });
    const badConnection: Connection = {
      from: { nodeId: 'missing', output: 'buf-x' },
      to: { nodeId: 'blur', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA], connections: [badConnection] }),
    );

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('E_RESOURCE_UNRESOLVED');
    expect(result.errors[0].nodeIds).toContain('missing');
  });

  it('returns E_FORMAT_MISMATCH when rgba8 output feeds node expecting rgba16f', () => {
    const nodeA = makeNode({
      id: 'source',
      outputTarget: { bufferId: 'buf-a', format: 'rgba8', resolution: 'full' },
    });
    const nodeB = makeNode({
      id: 'sink',
      inputSlots: [
        { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'source', output: 'buf-a' } },
      ],
      outputTarget: { bufferId: 'buf-b', format: 'rgba16f', resolution: 'full' },
    });
    const connection: Connection = {
      from: { nodeId: 'source', output: 'buf-a' },
      to: { nodeId: 'sink', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA, nodeB], connections: [connection] }),
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_FORMAT_MISMATCH')).toBe(true);
  });

  it('returns E_DUPLICATE_PROVIDER when two nodes write to same resource ID', () => {
    const nodeA = makeNode({
      id: 'writer1',
      outputTarget: { bufferId: 'shared-buf', format: 'rgba8', resolution: 'full' },
    });
    const nodeB = makeNode({
      id: 'writer1',
      outputTarget: { bufferId: 'shared-buf', format: 'rgba8', resolution: 'full' },
    });

    const result = buildResourceGraph(makeSpec({ nodes: [nodeA, nodeB] }));

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_DUPLICATE_PROVIDER')).toBe(true);
  });

  it('produces deterministic resource IDs across runs', () => {
    const nodeA = makeNode({
      id: 'blur',
      outputTarget: { bufferId: 'buf-blur', format: 'rgba8', resolution: 'full' },
    });

    const spec = makeSpec({ nodes: [nodeA] });
    const result1 = buildResourceGraph(spec);
    const result2 = buildResourceGraph(spec);

    const ids1 = Array.from(result1.graph!.resources.keys()).sort();
    const ids2 = Array.from(result2.graph!.resources.keys()).sort();
    expect(ids1).toEqual(ids2);
  });

  it('allows rgba16f -> rgba8 connection (downcast)', () => {
    const nodeA = makeNode({
      id: 'hdr-gen',
      outputTarget: { bufferId: 'buf-hdr', format: 'rgba16f', resolution: 'full' },
    });
    const nodeB = makeNode({
      id: 'tonemap',
      inputSlots: [
        { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'hdr-gen', output: 'buf-hdr' } },
      ],
      outputTarget: { bufferId: 'buf-ldr', format: 'rgba8', resolution: 'full' },
    });
    const connection: Connection = {
      from: { nodeId: 'hdr-gen', output: 'buf-hdr' },
      to: { nodeId: 'tonemap', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA, nodeB], connections: [connection] }),
    );

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects resolution mismatch (half -> full)', () => {
    const nodeA = makeNode({
      id: 'downsampled',
      outputTarget: { bufferId: 'buf-half', format: 'rgba8', resolution: 'half' },
    });
    const nodeB = makeNode({
      id: 'fullres',
      inputSlots: [
        { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'downsampled', output: 'buf-half' } },
      ],
      outputTarget: { bufferId: 'buf-full', format: 'rgba8', resolution: 'full' },
    });
    const connection: Connection = {
      from: { nodeId: 'downsampled', output: 'buf-half' },
      to: { nodeId: 'fullres', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA, nodeB], connections: [connection] }),
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_RESOLUTION_MISMATCH')).toBe(true);
  });

  it('bindings include both input and output entries', () => {
    const nodeA = makeNode({
      id: 'blur',
      outputTarget: { bufferId: 'buf-blur', format: 'rgba8', resolution: 'full' },
    });
    const nodeB = makeNode({
      id: 'bloom',
      inputSlots: [
        { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'blur', output: 'buf-blur' } },
      ],
      outputTarget: { bufferId: 'buf-bloom', format: 'rgba8', resolution: 'full' },
    });
    const connection: Connection = {
      from: { nodeId: 'blur', output: 'buf-blur' },
      to: { nodeId: 'bloom', input: 'input' },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA, nodeB], connections: [connection] }),
    );

    expect(result.success).toBe(true);
    const outputBindings = result.graph!.bindings.filter((b) => b.direction === 'output');
    const inputBindings = result.graph!.bindings.filter((b) => b.direction === 'input');

    expect(outputBindings.some((b) => b.passId === 'blur' && b.resourceId === 'blur:buf-blur')).toBe(true);
    expect(outputBindings.some((b) => b.passId === 'bloom' && b.resourceId === 'bloom:buf-bloom')).toBe(true);
    expect(inputBindings.some((b) => b.passId === 'bloom' && b.resourceId === 'blur:buf-blur')).toBe(true);
  });

  it('binds unconnected input slots to implicit input (entity scope)', () => {
    const nodeA = makeNode({
      id: 'fx',
      inputSlots: [
        { name: 'custom_input', dataType: 'texture', connectedTo: null },
      ],
      outputTarget: { bufferId: 'buf-fx', format: 'rgba8', resolution: 'full' },
    });

    const result = buildResourceGraph(
      makeSpec({ scope: 'entity', nodes: [nodeA] }),
    );

    expect(result.success).toBe(true);
    const inputBindings = result.graph!.bindings.filter((b) => b.direction === 'input');
    expect(inputBindings.some(
      (b) => b.passId === 'fx' && b.slotName === 'custom_input' && b.resourceId === '__entityTexture',
    )).toBe(true);
  });

  it('binds unconnected input slots to implicit input (screen scope)', () => {
    const nodeA = makeNode({
      id: 'fx',
      inputSlots: [
        { name: 'screen_tex', dataType: 'texture', connectedTo: null },
      ],
      outputTarget: { bufferId: 'buf-fx', format: 'rgba8', resolution: 'full' },
    });

    const result = buildResourceGraph(
      makeSpec({ scope: 'screen', nodes: [nodeA] }),
    );

    expect(result.success).toBe(true);
    const inputBindings = result.graph!.bindings.filter((b) => b.direction === 'input');
    expect(inputBindings.some(
      (b) => b.passId === 'fx' && b.slotName === 'screen_tex' && b.resourceId === '__screenColor',
    )).toBe(true);
  });

  it('does not double-bind slots that have feedback edges', () => {
    const nodeA = makeNode({
      id: 'trail',
      inputSlots: [
        { name: 'previous', dataType: 'texture', connectedTo: null },
      ],
      outputTarget: { bufferId: 'buf-trail', format: 'rgba8', resolution: 'full' },
      flags: { stateful: true, fusible: 'never' },
    });
    const feedback: FeedbackEdge = {
      from: { nodeId: 'trail', output: 'buf-trail' },
      to: { nodeId: 'trail', input: 'previous' },
      policy: {
        initMode: 'clear',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba8',
      },
    };

    const result = buildResourceGraph(
      makeSpec({ nodes: [nodeA], feedbackEdges: [feedback] }),
    );

    expect(result.success).toBe(true);
    const inputBindings = result.graph!.bindings.filter(
      (b) => b.direction === 'input' && b.passId === 'trail' && b.slotName === 'previous',
    );
    // Should have exactly one binding (feedback), not also an implicit input
    expect(inputBindings).toHaveLength(1);
    expect(inputBindings[0].resourceId).toBe('__feedback:trail->trail');
  });

  it('paint example: feedback binding is correct', () => {
    const nodeA = makeNode({
      id: 'fx',
      inputSlots: [
        { name: 'current_buffer', dataType: 'texture', connectedTo: null },
      ],
      outputTarget: { bufferId: 'canvas', format: 'rgba8', resolution: 'full' },
      flags: { stateful: true, fusible: 'never' },
    });
    const feedback: FeedbackEdge = {
      from: { nodeId: 'fx', output: 'canvas' },
      to: { nodeId: 'fx', input: 'current_buffer' },
      policy: {
        initMode: 'seedFromInput',
        swapPolicy: 'pingPong',
        stopBehavior: 'freeze',
        bufferFormat: 'rgba8',
      },
    };

    const result = buildResourceGraph(
      makeSpec({ scope: 'entity', nodes: [nodeA], feedbackEdges: [feedback] }),
    );

    expect(result.success).toBe(true);

    const inputBindings = result.graph!.bindings.filter((b) => b.direction === 'input');

    // current_buffer -> feedback resource
    const feedbackBinding = inputBindings.find(
      (b) => b.passId === 'fx' && b.slotName === 'current_buffer',
    );
    expect(feedbackBinding).toBeDefined();
    expect(feedbackBinding!.resourceId).toBe('__feedback:fx->fx');
  });
});
