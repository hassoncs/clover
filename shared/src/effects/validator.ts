import type { EffectGraphSpec, EffectNode, Connection, FeedbackEdge, BufferFormat } from './types';
import type { PlatformTier } from './types';
import { BUDGET_TIER_PRESETS } from './budget';
import type {
  GraphValidationError,
  GraphValidationErrorCode,
  GraphValidationResult,
} from './errors';

export interface ValidatorOptions {
  platformTier?: PlatformTier;
}

function err(
  code: GraphValidationErrorCode,
  message: string,
  nodeIds?: string[],
  path?: string,
): GraphValidationError {
  const e: GraphValidationError = { code, message };
  if (nodeIds) e.nodeIds = nodeIds;
  if (path) e.path = path;
  return e;
}

function checkEmptyGraph(graph: EffectGraphSpec, errors: GraphValidationError[]): void {
  if (graph.nodes.length === 0) {
    errors.push(err('E_EMPTY_GRAPH', 'Graph must have at least one node'));
  }
}

function checkDuplicateNodeIds(graph: EffectGraphSpec, errors: GraphValidationError[]): void {
  const seen = new Set<string>();
  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      errors.push(
        err('E_DUPLICATE_NODE_ID', `Duplicate node id "${node.id}"`, [node.id]),
      );
    }
    seen.add(node.id);
  }
}

function checkSelfLoops(graph: EffectGraphSpec, errors: GraphValidationError[]): void {
  for (const conn of graph.connections) {
    if (conn.from.nodeId === conn.to.nodeId) {
      errors.push(
        err('E_SELF_LOOP', `Connection from "${conn.from.nodeId}" to itself`, [conn.from.nodeId]),
      );
    }
  }
}

function checkMissingNodeRefs(
  graph: EffectGraphSpec,
  nodeIds: Set<string>,
  errors: GraphValidationError[],
): void {
  for (const conn of graph.connections) {
    if (!nodeIds.has(conn.from.nodeId)) {
      errors.push(
        err('E_MISSING_NODE_REF', `Connection references non-existent node "${conn.from.nodeId}"`, [conn.from.nodeId]),
      );
    }
    if (!nodeIds.has(conn.to.nodeId)) {
      errors.push(
        err('E_MISSING_NODE_REF', `Connection references non-existent node "${conn.to.nodeId}"`, [conn.to.nodeId]),
      );
    }
  }
  for (const fb of graph.feedbackEdges) {
    if (!nodeIds.has(fb.from.nodeId)) {
      errors.push(
        err('E_MISSING_NODE_REF', `Feedback edge references non-existent node "${fb.from.nodeId}"`, [fb.from.nodeId]),
      );
    }
    if (!nodeIds.has(fb.to.nodeId)) {
      errors.push(
        err('E_MISSING_NODE_REF', `Feedback edge references non-existent node "${fb.to.nodeId}"`, [fb.to.nodeId]),
      );
    }
  }
}

function checkDuplicateConnections(graph: EffectGraphSpec, errors: GraphValidationError[]): void {
  const seen = new Set<string>();
  for (const conn of graph.connections) {
    const key = `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
    if (seen.has(key)) {
      errors.push(
        err('E_DUPLICATE_CONNECTION', `Duplicate connection ${key}`, [conn.from.nodeId, conn.to.nodeId]),
      );
    }
    seen.add(key);
  }
}

function checkGeneratorHasInput(
  graph: EffectGraphSpec,
  nodeMap: Map<string, EffectNode>,
  errors: GraphValidationError[],
): void {
  const nodesWithInput = new Set<string>();
  for (const conn of graph.connections) {
    nodesWithInput.add(conn.to.nodeId);
  }

  for (const nodeId of nodesWithInput) {
    const node = nodeMap.get(nodeId);
    if (node && node.family === 'generator') {
      errors.push(
        err('E_GENERATOR_HAS_INPUT', `Generator node "${nodeId}" must not have connected inputs`, [nodeId]),
      );
    }
  }
}

function checkCycles(
  graph: EffectGraphSpec,
  nodeIds: Set<string>,
  errors: GraphValidationError[],
): void {
  const feedbackSet = new Set<string>();
  for (const fb of graph.feedbackEdges) {
    feedbackSet.add(`${fb.from.nodeId}:${fb.from.output}->${fb.to.nodeId}:${fb.to.input}`);
  }

  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
  }

  for (const conn of graph.connections) {
    const key = `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
    if (feedbackSet.has(key)) continue;
    if (conn.from.nodeId === conn.to.nodeId) continue;
    if (!nodeIds.has(conn.from.nodeId) || !nodeIds.has(conn.to.nodeId)) continue;

    adjacency.get(conn.from.nodeId)!.push(conn.to.nodeId);
    inDegree.set(conn.to.nodeId, (inDegree.get(conn.to.nodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (visited < nodeIds.size) {
    const cycleNodes = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) > 0);
    errors.push(
      err('E_GRAPH_CYCLE', `Graph contains a cycle involving nodes: ${cycleNodes.join(', ')}`, cycleNodes),
    );
  }
}

function checkFeedbackLimit(graph: EffectGraphSpec, errors: GraphValidationError[]): void {
  if (graph.feedbackEdges.length > 1) {
    errors.push(
      err(
        'E_FEEDBACK_LIMIT',
        `Graph has ${graph.feedbackEdges.length} feedback edges (max 1 per subgraph in v1)`,
      ),
    );
  }
}

function checkFeedbackInvalid(
  graph: EffectGraphSpec,
  nodeMap: Map<string, EffectNode>,
  errors: GraphValidationError[],
): void {
  for (const fb of graph.feedbackEdges) {
    const targetNode = nodeMap.get(fb.to.nodeId);
    if (targetNode && !targetNode.flags.stateful) {
      errors.push(
        err(
          'E_FEEDBACK_INVALID',
          `Feedback edge targets non-stateful node "${fb.to.nodeId}"`,
          [fb.to.nodeId],
        ),
      );
    }
  }
}

function checkFormatMismatch(
  graph: EffectGraphSpec,
  nodeMap: Map<string, EffectNode>,
  errors: GraphValidationError[],
): void {
  for (const conn of graph.connections) {
    const fromNode = nodeMap.get(conn.from.nodeId);
    const toNode = nodeMap.get(conn.to.nodeId);
    if (!fromNode || !toNode) continue;

    const sourceFormat = fromNode.outputTarget.format;
    const targetFormat = toNode.outputTarget.format;

    if (sourceFormat !== targetFormat) {
      errors.push(
        err(
          'E_FORMAT_MISMATCH',
          `Format mismatch: "${conn.from.nodeId}" outputs ${sourceFormat} but "${conn.to.nodeId}" expects ${targetFormat}`,
          [conn.from.nodeId, conn.to.nodeId],
        ),
      );
    }
  }
}

function checkDisconnectedNodes(
  graph: EffectGraphSpec,
  nodeMap: Map<string, EffectNode>,
  errors: GraphValidationError[],
): void {
  const connectedNodes = new Set<string>();
  for (const conn of graph.connections) {
    connectedNodes.add(conn.from.nodeId);
    connectedNodes.add(conn.to.nodeId);
  }
  for (const fb of graph.feedbackEdges) {
    connectedNodes.add(fb.from.nodeId);
    connectedNodes.add(fb.to.nodeId);
  }

  const externalInputNames = new Set(graph.externalInputs?.map(ext => ext.name) || []);

  for (const node of graph.nodes) {
    if (connectedNodes.has(node.id)) continue;
    if (node.family === 'generator') continue;
    
    const hasExternalInput = node.inputSlots.some(slot => externalInputNames.has(slot.name));
    if (hasExternalInput) continue;
    
    errors.push(
      err('E_DISCONNECTED_NODE', `Node "${node.id}" has no connections`, [node.id]),
    );
  }
}

function checkBudget(
  graph: EffectGraphSpec,
  options: ValidatorOptions,
  errors: GraphValidationError[],
): void {
  if (!options.platformTier) return;

  const tier = BUDGET_TIER_PRESETS[options.platformTier];
  const passCount = graph.nodes.length;

  if (passCount > tier.maxPasses) {
    errors.push(
      err(
        'E_BUDGET_EXCEEDED',
        `Graph has ${passCount} nodes but ${options.platformTier} allows max ${tier.maxPasses}`,
      ),
    );
  }
}

export function validateGraph(
  graph: EffectGraphSpec,
  options: ValidatorOptions = {},
): GraphValidationResult {
  const errors: GraphValidationError[] = [];

  checkEmptyGraph(graph, errors);
  if (graph.nodes.length === 0) {
    return { valid: false, errors };
  }

  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  checkDuplicateNodeIds(graph, errors);
  checkSelfLoops(graph, errors);
  checkMissingNodeRefs(graph, nodeIds, errors);
  checkDuplicateConnections(graph, errors);
  checkGeneratorHasInput(graph, nodeMap, errors);
  checkCycles(graph, nodeIds, errors);
  checkFeedbackLimit(graph, errors);
  checkFeedbackInvalid(graph, nodeMap, errors);
  checkFormatMismatch(graph, nodeMap, errors);
  checkDisconnectedNodes(graph, nodeMap, errors);
  checkBudget(graph, options, errors);

  return { valid: errors.length === 0, errors };
}
