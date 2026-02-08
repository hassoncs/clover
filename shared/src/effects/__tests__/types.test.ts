import { describe, it, expectTypeOf } from 'vitest';
import type {
  EffectGraphSpec,
  CompiledPlan,
  FeedbackPolicy,
  EffectNode,
  Connection,
  FeedbackEdge,
  ResourceRef,
  CompiledPass,
} from '../types';

function makeNode(overrides: Partial<EffectNode> & { id: string }): EffectNode {
  return {
    type: 'filter.blur.gaussian',
    family: 'filter',
    inputSlots: [
      { name: 'input', dataType: 'texture', connectedTo: null },
    ],
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

function makeConnection(from: string, to: string): Connection {
  return {
    from: { nodeId: from, output: 'main' },
    to: { nodeId: to, input: 'input' },
  };
}

function makeFeedbackPolicy(
  overrides: Partial<FeedbackPolicy> = {},
): FeedbackPolicy {
  return {
    initMode: 'clear',
    swapPolicy: 'pingPong',
    stopBehavior: 'freeze',
    bufferFormat: 'rgba8',
    ...overrides,
  };
}

describe('EffectGraphSpec', () => {
  it('constructs a valid screen-scope graph', () => {
    const graph: EffectGraphSpec = {
      id: 'test-graph',
      version: '1.0.0',
      engineApiVersion: '2.0.0',
      scope: 'screen',
      nodes: [makeNode({ id: 'blur-node' })],
      connections: [],
      feedbackEdges: [],
      lifecycle: { autoStart: true, stopMode: 'clear' },
    };

    expectTypeOf(graph).toMatchTypeOf<EffectGraphSpec>();
    expectTypeOf(graph.scope).toEqualTypeOf<'screen' | 'entity'>();
  });

  it('constructs a valid entity-scope graph', () => {
    const graph: EffectGraphSpec = {
      id: 'entity-graph',
      version: '0.1.0',
      engineApiVersion: '2.0.0',
      scope: 'entity',
      nodes: [
        makeNode({ id: 'gen', family: 'generator' }),
        makeNode({ id: 'combine', family: 'combiner' }),
      ],
      connections: [makeConnection('gen', 'combine')],
      feedbackEdges: [],
      lifecycle: { autoStart: false, stopMode: 'freeze' },
    };

    expectTypeOf(graph).toMatchTypeOf<EffectGraphSpec>();
  });

  it('supports feedback edges with policy', () => {
    const feedbackEdge: FeedbackEdge = {
      from: { nodeId: 'a', output: 'main' },
      to: { nodeId: 'a', input: 'feedback' },
      policy: makeFeedbackPolicy({ initMode: 'seedFromInput' }),
    };

    const graph: EffectGraphSpec = {
      id: 'feedback-graph',
      version: '1.0.0',
      engineApiVersion: '2.0.0',
      scope: 'screen',
      nodes: [makeNode({ id: 'a', flags: { stateful: true, fusible: 'never' } })],
      connections: [],
      feedbackEdges: [feedbackEdge],
      lifecycle: { autoStart: true, stopMode: 'freeze' },
    };

    expectTypeOf(graph).toMatchTypeOf<EffectGraphSpec>();
  });

  it('rejects missing required fields on EffectGraphSpec', () => {
    // @ts-expect-error missing id, version, engineApiVersion, scope, nodes, connections, feedbackEdges, lifecycle
    const _bad: EffectGraphSpec = {};

    // @ts-expect-error missing nodes and connections
    const _bad2: EffectGraphSpec = {
      id: 'x',
      version: '1.0.0',
      engineApiVersion: '2.0.0',
      scope: 'screen',
    };
  });

  it('rejects invalid scope value', () => {
    const _bad: EffectGraphSpec = {
      id: 'x',
      version: '1.0.0',
      engineApiVersion: '2.0.0',
      // @ts-expect-error 'global' is not a valid scope
      scope: 'global',
      nodes: [],
      connections: [],
      feedbackEdges: [],
      lifecycle: { autoStart: true, stopMode: 'clear' },
    };
  });
});

describe('CompiledPlan', () => {
  it('includes hash and compiledAt', () => {
    const plan: CompiledPlan = {
      id: 'plan-1',
      graphId: 'test-graph',
      graphVersion: '1.0.0',
      engineApiVersion: '2.0.0',
      scope: 'screen',
      passes: [],
      resourceMap: {},
      feedbackPolicies: {},
      hash: 'abc123def456',
      compiledAt: '2026-02-07T00:00:00.000Z',
    };

    expectTypeOf(plan.hash).toBeString();
    expectTypeOf(plan.compiledAt).toBeString();
    expectTypeOf(plan).toMatchTypeOf<CompiledPlan>();
  });

  it('contains requires/provides contracts on passes', () => {
    const resource: ResourceRef = {
      id: 'tex-input',
      type: 'texture',
      format: 'rgba8',
      resolution: 'full',
    };

    const pass: CompiledPass = {
      id: 'pass-blur',
      shaderSource: { type: 'builtin', effectType: 'blur' },
      requires: [resource],
      provides: [{ id: 'tex-output', type: 'buffer', format: 'rgba16f', resolution: 'half' }],
      params: { radius: 5 },
      paramsSchema: [{ name: 'radius', type: 'float' }],
      persistence: 'none',
      qualityTier: 'medium',
      constraints: { after: ['pass-init'] },
    };

    expectTypeOf(pass.requires).toMatchTypeOf<ResourceRef[]>();
    expectTypeOf(pass.provides).toMatchTypeOf<ResourceRef[]>();
  });

  it('rejects missing hash on CompiledPlan', () => {
    // @ts-expect-error missing hash and compiledAt
    const _bad: CompiledPlan = {
      id: 'plan-1',
      graphId: 'g',
      graphVersion: '1.0.0',
      engineApiVersion: '2.0.0',
      scope: 'screen',
      passes: [],
      resourceMap: {},
      feedbackPolicies: {},
    };
  });
});

describe('FeedbackPolicy', () => {
  it('enforces valid init modes', () => {
    const clearPolicy: FeedbackPolicy = makeFeedbackPolicy({ initMode: 'clear' });
    const seedPolicy: FeedbackPolicy = makeFeedbackPolicy({ initMode: 'seedFromInput' });
    const restorePolicy: FeedbackPolicy = makeFeedbackPolicy({ initMode: 'restoreSnapshot' });

    expectTypeOf(clearPolicy.initMode).toEqualTypeOf<'clear' | 'seedFromInput' | 'restoreSnapshot'>();
    expectTypeOf(seedPolicy).toMatchTypeOf<FeedbackPolicy>();
    expectTypeOf(restorePolicy).toMatchTypeOf<FeedbackPolicy>();
  });

  it('rejects invalid init mode', () => {
    const _bad: FeedbackPolicy = {
      // @ts-expect-error 'random' is not a valid initMode
      initMode: 'random',
      swapPolicy: 'pingPong',
      stopBehavior: 'freeze',
      bufferFormat: 'rgba8',
    };
  });

  it('rejects invalid swapPolicy', () => {
    const _bad: FeedbackPolicy = {
      initMode: 'clear',
      // @ts-expect-error 'doubleBuffer' is not a valid swapPolicy
      swapPolicy: 'doubleBuffer',
      stopBehavior: 'freeze',
      bufferFormat: 'rgba8',
    };
  });
});
