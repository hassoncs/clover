import { describe, it, expect } from 'vitest';
import { validateGraph } from '../validator';
import type { EffectGraphSpec, EffectNode, Connection, FeedbackEdge } from '../types';

function makeNode(overrides: Partial<EffectNode> & { id: string }): EffectNode {
  return {
    type: 'blur',
    family: 'filter',
    inputSlots: [
      { name: 'input', dataType: 'texture', connectedTo: null },
    ],
    params: {},
    outputTarget: {
      bufferId: `${overrides.id}-out`,
      format: 'rgba8',
      resolution: 'full',
    },
    flags: { stateful: false, fusible: 'conditional' },
    ...overrides,
  };
}

function makeGenerator(id: string): EffectNode {
  return makeNode({
    id,
    type: 'noise',
    family: 'generator',
    inputSlots: [],
  });
}

function makeStatefulNode(id: string): EffectNode {
  return makeNode({
    id,
    flags: { stateful: true, fusible: 'never' },
  });
}

function makeGraph(overrides: Partial<EffectGraphSpec> = {}): EffectGraphSpec {
  return {
    id: 'test-graph',
    version: '1.0.0',
    engineApiVersion: '1.0.0',
    scope: 'screen',
    nodes: [makeGenerator('gen'), makeNode({ id: 'filter1' })],
    connections: [
      { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'filter1', input: 'input' } },
    ],
    feedbackEdges: [],
    lifecycle: { autoStart: true, stopMode: 'clear' },
    ...overrides,
  };
}

describe('validateGraph', () => {
  describe('happy paths', () => {
    it('accepts a valid simple graph (generator -> filter)', () => {
      const result = validateGraph(makeGraph());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid graph with a feedback edge to a stateful node', () => {
      const stateful = makeStatefulNode('stateful1');
      const gen = makeGenerator('gen');
      const graph = makeGraph({
        nodes: [gen, stateful],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'stateful1', input: 'input' } },
        ],
        feedbackEdges: [
          {
            from: { nodeId: 'stateful1', output: 'default' },
            to: { nodeId: 'stateful1', input: 'feedback' },
            policy: {
              initMode: 'clear',
              swapPolicy: 'pingPong',
              stopBehavior: 'freeze',
              bufferFormat: 'rgba8',
            },
          },
        ],
      });

      const result = validateGraph(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid graph with entity scope', () => {
      const graph = makeGraph({ scope: 'entity' });
      const result = validateGraph(graph);
      expect(result.valid).toBe(true);
    });
  });

  describe('E_EMPTY_GRAPH', () => {
    it('rejects graph with no nodes', () => {
      const graph = makeGraph({ nodes: [], connections: [] });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E_EMPTY_GRAPH');
    });
  });

  describe('E_DUPLICATE_NODE_ID', () => {
    it('rejects two nodes with same ID', () => {
      const graph = makeGraph({
        nodes: [makeNode({ id: 'dup' }), makeNode({ id: 'dup' })],
        connections: [],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_DUPLICATE_NODE_ID')).toBe(true);
      expect(result.errors.find((e) => e.code === 'E_DUPLICATE_NODE_ID')!.nodeIds).toContain('dup');
    });
  });

  describe('E_SELF_LOOP', () => {
    it('rejects connection from node to itself', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen'), makeNode({ id: 'A' })],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'A', input: 'input' } },
          { from: { nodeId: 'A', output: 'default' }, to: { nodeId: 'A', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_SELF_LOOP')).toBe(true);
    });
  });

  describe('E_MISSING_NODE_REF', () => {
    it('rejects connection referencing non-existent node', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen')],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'ghost', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_MISSING_NODE_REF')).toBe(true);
      expect(result.errors.find((e) => e.code === 'E_MISSING_NODE_REF')!.nodeIds).toContain('ghost');
    });
  });

  describe('E_DUPLICATE_CONNECTION', () => {
    it('rejects duplicate connections', () => {
      const conn: Connection = {
        from: { nodeId: 'gen', output: 'default' },
        to: { nodeId: 'filter1', input: 'input' },
      };
      const graph = makeGraph({
        connections: [conn, conn],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_DUPLICATE_CONNECTION')).toBe(true);
    });
  });

  describe('E_GENERATOR_HAS_INPUT', () => {
    it('rejects generator node with connected input', () => {
      const gen = makeGenerator('gen');
      const gen2 = makeGenerator('gen2');
      const graph = makeGraph({
        nodes: [gen, gen2],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'gen2', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_GENERATOR_HAS_INPUT')).toBe(true);
      expect(result.errors.find((e) => e.code === 'E_GENERATOR_HAS_INPUT')!.nodeIds).toContain('gen2');
    });
  });

  describe('E_GRAPH_CYCLE', () => {
    it('rejects A->B->A cycle without feedback edge', () => {
      const graph = makeGraph({
        nodes: [makeNode({ id: 'A' }), makeNode({ id: 'B' })],
        connections: [
          { from: { nodeId: 'A', output: 'default' }, to: { nodeId: 'B', input: 'input' } },
          { from: { nodeId: 'B', output: 'default' }, to: { nodeId: 'A', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_GRAPH_CYCLE')).toBe(true);
    });

    it('rejects A->B->C->A three-node cycle', () => {
      const graph = makeGraph({
        nodes: [makeNode({ id: 'A' }), makeNode({ id: 'B' }), makeNode({ id: 'C' })],
        connections: [
          { from: { nodeId: 'A', output: 'default' }, to: { nodeId: 'B', input: 'input' } },
          { from: { nodeId: 'B', output: 'default' }, to: { nodeId: 'C', input: 'input' } },
          { from: { nodeId: 'C', output: 'default' }, to: { nodeId: 'A', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_GRAPH_CYCLE')).toBe(true);
    });
  });

  describe('E_FEEDBACK_LIMIT', () => {
    it('rejects two feedback edges in same graph', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen'), makeStatefulNode('s1'), makeStatefulNode('s2')],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 's1', input: 'input' } },
          { from: { nodeId: 's1', output: 'default' }, to: { nodeId: 's2', input: 'input' } },
        ],
        feedbackEdges: [
          {
            from: { nodeId: 's1', output: 'default' },
            to: { nodeId: 's1', input: 'feedback' },
            policy: { initMode: 'clear', swapPolicy: 'pingPong', stopBehavior: 'freeze', bufferFormat: 'rgba8' },
          },
          {
            from: { nodeId: 's2', output: 'default' },
            to: { nodeId: 's2', input: 'feedback' },
            policy: { initMode: 'clear', swapPolicy: 'pingPong', stopBehavior: 'freeze', bufferFormat: 'rgba8' },
          },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_FEEDBACK_LIMIT')).toBe(true);
    });
  });

  describe('E_FEEDBACK_INVALID', () => {
    it('rejects feedback edge to non-stateful node', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen'), makeNode({ id: 'plain' })],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'plain', input: 'input' } },
        ],
        feedbackEdges: [
          {
            from: { nodeId: 'plain', output: 'default' },
            to: { nodeId: 'plain', input: 'feedback' },
            policy: { initMode: 'clear', swapPolicy: 'pingPong', stopBehavior: 'freeze', bufferFormat: 'rgba8' },
          },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_FEEDBACK_INVALID')).toBe(true);
    });
  });

  describe('E_BUDGET_EXCEEDED', () => {
    it('rejects graph with 5 passes on mobile-low (max 4)', () => {
      const nodes = [
        makeGenerator('gen'),
        makeNode({ id: 'n1' }),
        makeNode({ id: 'n2' }),
        makeNode({ id: 'n3' }),
        makeNode({ id: 'n4' }),
      ];
      const connections: Connection[] = [
        { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'n1', input: 'input' } },
        { from: { nodeId: 'n1', output: 'default' }, to: { nodeId: 'n2', input: 'input' } },
        { from: { nodeId: 'n2', output: 'default' }, to: { nodeId: 'n3', input: 'input' } },
        { from: { nodeId: 'n3', output: 'default' }, to: { nodeId: 'n4', input: 'input' } },
      ];
      const graph = makeGraph({ nodes, connections });
      const result = validateGraph(graph, { platformTier: 'mobile-low' });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_BUDGET_EXCEEDED')).toBe(true);
      expect(result.errors.find((e) => e.code === 'E_BUDGET_EXCEEDED')!.message).toContain('mobile-low');
    });

    it('accepts graph within budget when no tier specified', () => {
      const nodes = [
        makeGenerator('gen'),
        makeNode({ id: 'n1' }),
        makeNode({ id: 'n2' }),
        makeNode({ id: 'n3' }),
        makeNode({ id: 'n4' }),
      ];
      const connections: Connection[] = [
        { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'n1', input: 'input' } },
        { from: { nodeId: 'n1', output: 'default' }, to: { nodeId: 'n2', input: 'input' } },
        { from: { nodeId: 'n2', output: 'default' }, to: { nodeId: 'n3', input: 'input' } },
        { from: { nodeId: 'n3', output: 'default' }, to: { nodeId: 'n4', input: 'input' } },
      ];
      const graph = makeGraph({ nodes, connections });
      const result = validateGraph(graph);

      expect(result.valid).toBe(true);
    });
  });

  describe('E_FORMAT_MISMATCH', () => {
    it('rejects rgba8 output connected to node expecting rgba16f', () => {
      const producer = makeNode({
        id: 'producer',
        family: 'generator',
        inputSlots: [],
        outputTarget: { bufferId: 'producer-out', format: 'rgba8', resolution: 'full' },
      });
      const consumer = makeNode({
        id: 'consumer',
        inputSlots: [
          { name: 'input', dataType: 'texture', connectedTo: { nodeId: 'producer', output: 'default' } },
        ],
        outputTarget: { bufferId: 'consumer-out', format: 'rgba16f', resolution: 'full' },
      });
      const graph = makeGraph({
        nodes: [producer, consumer],
        connections: [
          { from: { nodeId: 'producer', output: 'default' }, to: { nodeId: 'consumer', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_FORMAT_MISMATCH')).toBe(true);
    });

    it('accepts matching formats (both rgba8)', () => {
      const result = validateGraph(makeGraph());
      expect(result.valid).toBe(true);
    });
  });

  describe('E_DISCONNECTED_NODE', () => {
    it('rejects non-generator node with no connections', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen'), makeNode({ id: 'filter1' }), makeNode({ id: 'orphan' })],
        connections: [
          { from: { nodeId: 'gen', output: 'default' }, to: { nodeId: 'filter1', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_DISCONNECTED_NODE')).toBe(true);
      expect(result.errors.find((e) => e.code === 'E_DISCONNECTED_NODE')!.nodeIds).toContain('orphan');
    });

    it('allows standalone generator', () => {
      const graph = makeGraph({
        nodes: [makeGenerator('gen')],
        connections: [],
      });
      const result = validateGraph(graph);

      expect(result.errors.some((e) => e.code === 'E_DISCONNECTED_NODE')).toBe(false);
    });
  });

  describe('multiple errors', () => {
    it('returns all errors when graph has multiple issues', () => {
      const graph = makeGraph({
        nodes: [makeNode({ id: 'dup' }), makeNode({ id: 'dup' })],
        connections: [
          { from: { nodeId: 'dup', output: 'default' }, to: { nodeId: 'dup', input: 'input' } },
        ],
      });
      const result = validateGraph(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain('E_DUPLICATE_NODE_ID');
      expect(codes).toContain('E_SELF_LOOP');
    });
  });
});
