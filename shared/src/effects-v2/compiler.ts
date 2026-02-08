import type {
  EffectGraphSpec,
  EffectNode,
  CompiledPlan,
  CompiledPass,
  ResourceRef,
  FeedbackPolicy,
  ShaderSource,
} from './types';
import type { PlatformTier } from '../types/effect-budget';
import { validateGraph } from './validator';
import { buildResourceGraph } from './resources';
import type { ResourceGraph, ResourceNode } from './resources';

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface OrderingConstraints {
  [nodeId: string]: {
    before?: string[];
    after?: string[];
  };
}

export interface CompilerOptions {
  platformTier?: PlatformTier;
  orderingConstraints?: OrderingConstraints;
}

export interface CompileError {
  code: string;
  message: string;
  nodeIds?: string[];
}

export interface CompileResult {
  success: boolean;
  plan?: CompiledPlan;
  errors: CompileError[];
}

// ---------------------------------------------------------------------------
// Deterministic hash — FNV-1a over stable JSON serialization
// ---------------------------------------------------------------------------

function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys.map(
      (k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]),
    );
    return '{' + pairs.join(',') + '}';
  }

  return String(obj);
}

function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableHash(obj: unknown): string {
  return fnv1aHash(stableStringify(obj));
}

// ---------------------------------------------------------------------------
// Topological sort — Kahn's algorithm with stable alphabetical tie-breaking
// ---------------------------------------------------------------------------

interface TopoResult {
  sorted: string[];
  hasCycle: boolean;
  cycleNodes: string[];
}

function topologicalSort(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
): TopoResult {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of nodeIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) continue;
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  queue.sort();

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = adjacency.get(current) ?? [];
    const readyNeighbors: string[] = [];

    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) readyNeighbors.push(neighbor);
    }

    readyNeighbors.sort();
    for (const n of readyNeighbors) {
      const insertIdx = binarySearchInsert(queue, n);
      queue.splice(insertIdx, 0, n);
    }
  }

  if (sorted.length < nodeIds.length) {
    const cycleNodes = nodeIds.filter((id) => (inDegree.get(id) ?? 0) > 0);
    return { sorted, hasCycle: true, cycleNodes };
  }

  return { sorted, hasCycle: false, cycleNodes: [] };
}

function binarySearchInsert(sortedArr: string[], value: string): number {
  let lo = 0;
  let hi = sortedArr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedArr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------------------
// Ordering constraint edges
// ---------------------------------------------------------------------------

function buildConstraintEdges(
  constraints: OrderingConstraints,
  nodeIds: Set<string>,
): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];

  for (const [nodeId, constraint] of Object.entries(constraints)) {
    if (!nodeIds.has(nodeId)) continue;

    if (constraint.before) {
      for (const target of constraint.before) {
        if (nodeIds.has(target)) {
          edges.push({ from: nodeId, to: target });
        }
      }
    }

    if (constraint.after) {
      for (const source of constraint.after) {
        if (nodeIds.has(source)) {
          edges.push({ from: source, to: nodeId });
        }
      }
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// Resource conversion — ResourceNode → ResourceRef
// ---------------------------------------------------------------------------

function toResourceRef(node: ResourceNode): ResourceRef {
  return {
    id: node.id,
    type: node.kind === 'feedback' ? 'buffer' : 'texture',
    format: node.format,
    resolution: node.resolution,
  };
}

// ---------------------------------------------------------------------------
// Compiled pass builder
// ---------------------------------------------------------------------------

function buildCompiledPass(
  node: EffectNode,
  resourceGraph: ResourceGraph,
): CompiledPass {
  const requires: ResourceRef[] = [];
  const provides: ResourceRef[] = [];

  for (const binding of resourceGraph.bindings) {
    if (binding.passId !== node.id) continue;

    const resource = resourceGraph.resources.get(binding.resourceId);
    if (!resource) continue;

    const ref = toResourceRef(resource);
    if (binding.direction === 'input') {
      requires.push(ref);
    } else {
      provides.push(ref);
    }
  }

  requires.sort((a, b) => a.id.localeCompare(b.id));
  provides.sort((a, b) => a.id.localeCompare(b.id));

  const shaderSource: ShaderSource = { type: 'custom', glsl: '' };

  return {
    id: node.id,
    shaderSource,
    requires,
    provides,
    params: { ...node.params },
    paramsSchema: [],
    persistence: node.flags.stateful ? 'pingPong' : 'none',
    qualityTier: 'medium',
    constraints: {},
  };
}

// ---------------------------------------------------------------------------
// compileGraph — main entry point
// ---------------------------------------------------------------------------

export function compileGraph(
  graph: EffectGraphSpec,
  options: CompilerOptions = {},
): CompileResult {
  const validationResult = validateGraph(graph, {
    platformTier: options.platformTier,
  });

  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors.map((e) => ({
        code: e.code,
        message: e.message,
        nodeIds: e.nodeIds,
      })),
    };
  }

  const resourceResult = buildResourceGraph(graph);
  if (!resourceResult.success) {
    return {
      success: false,
      errors: resourceResult.errors.map((e) => ({
        code: e.code,
        message: e.message,
        nodeIds: e.nodeIds,
      })),
    };
  }

  const resourceGraph = resourceResult.graph!;
  const nodeIds = graph.nodes.map((n) => n.id);
  const nodeIdSet = new Set(nodeIds);

  const feedbackSet = new Set<string>();
  for (const fb of graph.feedbackEdges) {
    feedbackSet.add(`${fb.from.nodeId}->${fb.to.nodeId}`);
  }

  const dataEdges: Array<{ from: string; to: string }> = [];
  for (const conn of graph.connections) {
    const key = `${conn.from.nodeId}->${conn.to.nodeId}`;
    if (feedbackSet.has(key)) continue;
    if (conn.from.nodeId === conn.to.nodeId) continue;
    dataEdges.push({ from: conn.from.nodeId, to: conn.to.nodeId });
  }

  const constraintEdges = options.orderingConstraints
    ? buildConstraintEdges(options.orderingConstraints, nodeIdSet)
    : [];

  const allEdges = [...dataEdges, ...constraintEdges];

  const topoResult = topologicalSort(nodeIds, allEdges);

  if (topoResult.hasCycle) {
    return {
      success: false,
      errors: [
        {
          code: 'E_ORDER_CONFLICT',
          message: `Contradictory ordering constraints create a cycle involving: ${topoResult.cycleNodes.join(', ')}`,
          nodeIds: topoResult.cycleNodes,
        },
      ],
    };
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const passes: CompiledPass[] = [];

  for (const nodeId of topoResult.sorted) {
    const node = nodeMap.get(nodeId)!;
    passes.push(buildCompiledPass(node, resourceGraph));
  }

  const resourceMap: Record<string, ResourceRef> = {};
  for (const [id, node] of resourceGraph.resources) {
    resourceMap[id] = toResourceRef(node);
  }

  const feedbackPolicies: Record<string, FeedbackPolicy> = {};
  for (const fb of graph.feedbackEdges) {
    const key = `__feedback:${fb.from.nodeId}->${fb.to.nodeId}`;
    feedbackPolicies[key] = fb.policy;
  }

  const planContent = {
    graphId: graph.id,
    graphVersion: graph.version,
    engineApiVersion: graph.engineApiVersion,
    scope: graph.scope,
    passes: passes.map((p) => ({
      id: p.id,
      shaderSource: p.shaderSource,
      requires: p.requires,
      provides: p.provides,
      params: p.params,
      paramsSchema: p.paramsSchema,
      persistence: p.persistence,
      qualityTier: p.qualityTier,
      constraints: p.constraints,
    })),
    resourceMap,
    feedbackPolicies,
  };

  const hash = stableHash(planContent);

  const plan: CompiledPlan = {
    id: `${graph.id}:${hash}`,
    graphId: graph.id,
    graphVersion: graph.version,
    engineApiVersion: graph.engineApiVersion,
    scope: graph.scope,
    passes,
    resourceMap,
    feedbackPolicies,
    hash,
    compiledAt: new Date().toISOString(),
  };

  return { success: true, plan, errors: [] };
}
