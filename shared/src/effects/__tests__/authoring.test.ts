import { describe, it, expect } from 'vitest';
import { ManifestRegistry } from '../registry';
import type { NodeTypeRegistration } from '../registry';
import { normalizeAIOutput } from '../normalizer';
import type { NormalizationError } from '../normalizer';
import { authorGraph } from '../authoring';

interface RawNode {
  [key: string]: unknown;
  id: string;
  type: string;
  family: string;
  inputSlots: Record<string, unknown>[];
  params: Record<string, unknown>;
  outputTarget: Record<string, unknown>;
  flags: Record<string, unknown>;
}

interface RawConnectionEnd {
  [key: string]: unknown;
  nodeId: string;
  output?: string;
  input?: string;
}

interface RawConnection {
  [key: string]: unknown;
  from: RawConnectionEnd;
  to: RawConnectionEnd;
}

interface RawGraph {
  [key: string]: unknown;
  id: string;
  version: string;
  engineApiVersion: string;
  scope: string;
  nodes: RawNode[];
  connections: RawConnection[];
  feedbackEdges?: unknown[];
  lifecycle?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Test helpers — registry fixtures
// ---------------------------------------------------------------------------

function makeRegistration(overrides: Partial<NodeTypeRegistration> & { type: string }): NodeTypeRegistration {
  return {
    family: 'filter',
    displayName: overrides.type,
    description: `Test ${overrides.type}`,
    inputSlots: [{ name: 'input', dataType: 'texture', required: true }],
    outputType: 'texture',
    defaultParams: {},
    paramsSchema: [],
    tags: [],
    performanceTier: 'medium',
    constraints: {},
    aiHints: { aliases: [], promptDescription: '', commonCombinations: [] },
    ...overrides,
  };
}

function buildTestRegistry(): ManifestRegistry {
  const registry = new ManifestRegistry();

  registry.register(makeRegistration({
    type: 'noise',
    family: 'generator',
    inputSlots: [],
    paramsSchema: [
      { name: 'scale', type: 'float', range: { min: 0.1, max: 10 }, defaultValue: 1.0 },
      { name: 'octaves', type: 'int', range: { min: 1, max: 8 }, defaultValue: 4 },
    ],
    defaultParams: { scale: 1.0, octaves: 4 },
    aiHints: { aliases: ['perlin', 'simplex'], promptDescription: 'noise generator', commonCombinations: ['blur'] },
  }));

  registry.register(makeRegistration({
    type: 'blur',
    family: 'filter',
    paramsSchema: [
      { name: 'radius', type: 'float', range: { min: 0, max: 50 }, defaultValue: 5 },
    ],
    defaultParams: { radius: 5 },
  }));

  registry.register(makeRegistration({
    type: 'blend',
    family: 'combiner',
    inputSlots: [
      { name: 'inputA', dataType: 'texture', required: true },
      { name: 'inputB', dataType: 'texture', required: true },
    ],
    paramsSchema: [
      { name: 'mode', type: 'int', range: { min: 0, max: 3 }, defaultValue: 0 },
    ],
    defaultParams: { mode: 0 },
  }));

  return registry;
}

function makeValidAIOutput(): RawGraph {
  return {
    id: 'test-graph',
    version: '1.0.0',
    engineApiVersion: '1.0.0',
    scope: 'screen',
    nodes: [
      {
        id: 'gen',
        type: 'noise',
        family: 'generator',
        inputSlots: [],
        params: { scale: 2.0, octaves: 3 },
        outputTarget: { bufferId: 'gen-out', format: 'rgba8', resolution: 'full' },
        flags: { stateful: false, fusible: 'conditional' },
      },
      {
        id: 'filter1',
        type: 'blur',
        family: 'filter',
        inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: null }],
        params: { radius: 10 },
        outputTarget: { bufferId: 'filter1-out', format: 'rgba8', resolution: 'full' },
        flags: { stateful: false, fusible: 'conditional' },
      },
    ],
    connections: [
      { from: { nodeId: 'gen', output: 'gen-out' }, to: { nodeId: 'filter1', input: 'input' } },
    ],
    feedbackEdges: [],
    lifecycle: { autoStart: true, stopMode: 'clear' },
  };
}

// ---------------------------------------------------------------------------
// normalizeAIOutput tests
// ---------------------------------------------------------------------------

describe('normalizeAIOutput', () => {
  const registry = buildTestRegistry();

  describe('parse validation', () => {
    it('rejects non-object input', () => {
      const result = normalizeAIOutput('not an object', registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_PARSE_FAILED')).toBe(true);
    });

    it('rejects null input', () => {
      const result = normalizeAIOutput(null, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_PARSE_FAILED')).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = normalizeAIOutput({ id: 'test' }, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('rejects when nodes is not an array', () => {
      const raw = makeValidAIOutput();
      (raw as Record<string, unknown>).nodes = 'not an array';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_PARSE_FAILED')).toBe(true);
    });

    it('rejects when connections is not an array', () => {
      const raw = makeValidAIOutput();
      (raw as Record<string, unknown>).connections = 'bad';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_PARSE_FAILED')).toBe(true);
    });
  });

  describe('node type validation', () => {
    it('rejects unknown node types', () => {
      const raw = makeValidAIOutput();
      raw.nodes[0].type = 'hallucinated_effect';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_UNKNOWN_NODE_TYPE')).toBe(true);
      expect(result.errors.find((e: NormalizationError) => e.code === 'E_UNKNOWN_NODE_TYPE')!.message).toContain('hallucinated_effect');
    });

    it('resolves alias to canonical type', () => {
      const raw = makeValidAIOutput();
      raw.nodes[0].type = 'perlin';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      const genNode = result.graph!.nodes.find((n) => n.id === 'gen')!;
      expect(genNode.type).toBe('noise');
    });
  });

  describe('param shape validation', () => {
    it('rejects string where number expected', () => {
      const raw = makeValidAIOutput();
      (raw.nodes[0].params as Record<string, unknown>).scale = 'not a number';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_INVALID_PARAM_SHAPE')).toBe(true);
    });

    it('rejects boolean where number expected', () => {
      const raw = makeValidAIOutput();
      (raw.nodes[0].params as Record<string, unknown>).scale = true;
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_INVALID_PARAM_SHAPE')).toBe(true);
    });
  });

  describe('connection validation', () => {
    it('rejects connections referencing non-existent nodes', () => {
      const raw = makeValidAIOutput();
      raw.connections[0].from.nodeId = 'ghost-node';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_INVALID_CONNECTION')).toBe(true);
    });

    it('rejects connections to non-existent target', () => {
      const raw = makeValidAIOutput();
      raw.connections[0].to.nodeId = 'missing-target';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: NormalizationError) => e.code === 'E_INVALID_CONNECTION')).toBe(true);
    });
  });

  describe('canonicalization', () => {
    it('sorts nodes by ID for deterministic output', () => {
      const raw = makeValidAIOutput();
      raw.nodes.reverse();
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      const ids = result.graph!.nodes.map((n) => n.id);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    });

    it('sorts connections deterministically', () => {
      const raw = {
        ...makeValidAIOutput(),
        nodes: [
          {
            id: 'gen',
            type: 'noise',
            family: 'generator',
            inputSlots: [],
            params: { scale: 2.0, octaves: 3 },
            outputTarget: { bufferId: 'gen-out', format: 'rgba8', resolution: 'full' },
            flags: { stateful: false, fusible: 'conditional' },
          },
          {
            id: 'blurA',
            type: 'blur',
            family: 'filter',
            inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: null }],
            params: { radius: 5 },
            outputTarget: { bufferId: 'blurA-out', format: 'rgba8', resolution: 'full' },
            flags: { stateful: false, fusible: 'conditional' },
          },
          {
            id: 'blurB',
            type: 'blur',
            family: 'filter',
            inputSlots: [{ name: 'input', dataType: 'texture', connectedTo: null }],
            params: { radius: 8 },
            outputTarget: { bufferId: 'blurB-out', format: 'rgba8', resolution: 'full' },
            flags: { stateful: false, fusible: 'conditional' },
          },
        ],
        connections: [
          { from: { nodeId: 'gen', output: 'gen-out' }, to: { nodeId: 'blurB', input: 'input' } },
          { from: { nodeId: 'gen', output: 'gen-out' }, to: { nodeId: 'blurA', input: 'input' } },
        ],
      };
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      const connKeys = result.graph!.connections.map(
        (c) => `${c.from.nodeId}:${c.from.output}->${c.to.nodeId}:${c.to.input}`,
      );
      const sorted = [...connKeys].sort();
      expect(connKeys).toEqual(sorted);
    });

    it('clamps numbers to valid ranges', () => {
      const raw = makeValidAIOutput();
      raw.nodes[0].params.scale = 999;
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      expect(result.graph!.nodes.find((n) => n.id === 'gen')!.params.scale).toBe(10);
    });

    it('trims string param values', () => {
      const raw = makeValidAIOutput();
      (raw.nodes[0].params as Record<string, unknown>).label = '  hello  ';
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
    });

    it('equivalent graphs with different node order produce identical output', () => {
      const raw1 = makeValidAIOutput();
      const raw2 = makeValidAIOutput();
      raw2.nodes.reverse();
      const result1 = normalizeAIOutput(raw1, registry);
      const result2 = normalizeAIOutput(raw2, registry);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(JSON.stringify(result1.graph)).toBe(JSON.stringify(result2.graph));
    });
  });

  describe('default filling', () => {
    it('fills missing optional params with registry defaults', () => {
      const raw = makeValidAIOutput();
      (raw.nodes[0] as Record<string, unknown>).params = {};
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      const genNode = result.graph!.nodes.find((n) => n.id === 'gen')!;
      expect(genNode.params.scale).toBe(1.0);
      expect(genNode.params.octaves).toBe(4);
    });

    it('fills missing feedbackEdges as empty array', () => {
      const raw = makeValidAIOutput();
      delete (raw as Record<string, unknown>).feedbackEdges;
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      expect(result.graph!.feedbackEdges).toEqual([]);
    });

    it('fills missing lifecycle with defaults', () => {
      const raw = makeValidAIOutput();
      delete (raw as Record<string, unknown>).lifecycle;
      const result = normalizeAIOutput(raw, registry);
      expect(result.success).toBe(true);
      expect(result.graph!.lifecycle).toEqual({ autoStart: true, stopMode: 'clear' });
    });
  });

  describe('valid output', () => {
    it('accepts a fully valid AI output', () => {
      const result = normalizeAIOutput(makeValidAIOutput(), registry);
      expect(result.success).toBe(true);
      expect(result.graph).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// authorGraph tests
// ---------------------------------------------------------------------------

describe('authorGraph', () => {
  const registry = buildTestRegistry();

  it('valid AI output → successful compilation with plan', () => {
    const result = authorGraph(makeValidAIOutput(), registry);
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.graph).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('equivalent AI outputs → identical plan hash', () => {
    const raw1 = makeValidAIOutput();
    const raw2 = makeValidAIOutput();
    raw2.nodes.reverse();
    const result1 = authorGraph(raw1, registry);
    const result2 = authorGraph(raw2, registry);
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.plan!.hash).toBe(result2.plan!.hash);
  });

  it('unknown node type → E_UNKNOWN_NODE_TYPE', () => {
    const raw = makeValidAIOutput();
    raw.nodes[0].type = 'hallucinated_sparkle_rain';
    const result = authorGraph(raw, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_UNKNOWN_NODE_TYPE')).toBe(true);
  });

  it('invalid param shape → E_INVALID_PARAM_SHAPE', () => {
    const raw = makeValidAIOutput();
    (raw.nodes[0].params as Record<string, unknown>).scale = 'big';
    const result = authorGraph(raw, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_INVALID_PARAM_SHAPE')).toBe(true);
  });

  it('missing required field → E_MISSING_REQUIRED_FIELD', () => {
    const result = authorGraph({ id: 'x' }, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_MISSING_REQUIRED_FIELD')).toBe(true);
  });

  it('invalid connection ref → E_INVALID_CONNECTION', () => {
    const raw = makeValidAIOutput();
    raw.connections[0].from.nodeId = 'nonexistent';
    const result = authorGraph(raw, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_INVALID_CONNECTION')).toBe(true);
  });

  it('hallucinated effect ID → rejected with structured error', () => {
    const raw = makeValidAIOutput();
    raw.nodes.push({
      id: 'fake',
      type: 'rainbow_explosion_deluxe',
      family: 'generator',
      inputSlots: [],
      params: {} as Record<string, never>,
      outputTarget: { bufferId: 'fake-out', format: 'rgba8', resolution: 'full' },
      flags: { stateful: false, fusible: 'conditional' },
    } as (typeof raw.nodes)[number]);
    const result = authorGraph(raw, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'E_UNKNOWN_NODE_TYPE')).toBe(true);
    expect(result.errors.find((e) => e.code === 'E_UNKNOWN_NODE_TYPE')!.message).toContain('rainbow_explosion_deluxe');
  });

  it('valid output with defaults filled → compiles successfully', () => {
    const raw = makeValidAIOutput();
    raw.nodes[0].params = {};
    delete (raw as Record<string, unknown>).feedbackEdges;
    delete (raw as Record<string, unknown>).lifecycle;
    const result = authorGraph(raw, registry);
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
  });

  it('passes platformTier option through to compiler', () => {
    const raw = makeValidAIOutput();
    const result = authorGraph(raw, registry, { platformTier: 'web-high' });
    expect(result.success).toBe(true);
  });
});
