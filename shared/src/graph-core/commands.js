const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
export function createEmptyDocument(id) {
    return {
        id,
        nodes: {},
        edges: {},
        viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
    };
}
export function createUndoableState(document) {
    return { document, past: [], future: [] };
}
function cloneDocument(doc) {
    return {
        id: doc.id,
        nodes: { ...doc.nodes },
        edges: { ...doc.edges },
        viewport: { pan: { ...doc.viewport.pan }, zoom: doc.viewport.zoom },
    };
}
function withHistory(prev, next) {
    return {
        document: next,
        past: [...prev.past, prev.document],
        future: [],
    };
}
function error(state, message) {
    return { state, error: message };
}
function nodeHasPort(node, portId) {
    return node.ports.some((p) => p.id === portId);
}
function applyAddNode(doc, node) {
    if (doc.nodes[node.id]) {
        return `Node ${node.id} already exists`;
    }
    const next = cloneDocument(doc);
    next.nodes[node.id] = node;
    return next;
}
function applyRemoveNode(doc, nodeId) {
    if (!doc.nodes[nodeId]) {
        return `Node ${nodeId} not found`;
    }
    const next = cloneDocument(doc);
    delete next.nodes[nodeId];
    const edgesToRemove = Object.keys(next.edges).filter((eid) => {
        const e = next.edges[eid];
        return e.from.nodeId === nodeId || e.to.nodeId === nodeId;
    });
    for (const eid of edgesToRemove) {
        delete next.edges[eid];
    }
    return next;
}
function applyConnect(doc, edge) {
    if (doc.edges[edge.id]) {
        return `Edge ${edge.id} already exists`;
    }
    const srcNode = doc.nodes[edge.from.nodeId];
    if (!srcNode) {
        return `Source node ${edge.from.nodeId} not found`;
    }
    const tgtNode = doc.nodes[edge.to.nodeId];
    if (!tgtNode) {
        return `Target node ${edge.to.nodeId} not found`;
    }
    if (!nodeHasPort(srcNode, edge.from.portId)) {
        return `Source port ${edge.from.portId} not found on node ${edge.from.nodeId}`;
    }
    if (!nodeHasPort(tgtNode, edge.to.portId)) {
        return `Target port ${edge.to.portId} not found on node ${edge.to.nodeId}`;
    }
    const next = cloneDocument(doc);
    next.edges[edge.id] = edge;
    return next;
}
function applyDisconnect(doc, edgeId) {
    if (!doc.edges[edgeId]) {
        return `Edge ${edgeId} not found`;
    }
    const next = cloneDocument(doc);
    delete next.edges[edgeId];
    return next;
}
function applyMoveNode(doc, nodeId, position) {
    const node = doc.nodes[nodeId];
    if (!node) {
        return `Node ${nodeId} not found`;
    }
    const next = cloneDocument(doc);
    next.nodes[nodeId] = { ...node, position: { ...position } };
    return next;
}
function applyPan(doc, pan) {
    const next = cloneDocument(doc);
    next.viewport = { ...next.viewport, pan: { ...pan } };
    return next;
}
function applyZoom(doc, zoom) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const next = cloneDocument(doc);
    next.viewport = { ...next.viewport, zoom: clamped };
    return next;
}
function applyUpdateNodeData(doc, nodeId, data) {
    const node = doc.nodes[nodeId];
    if (!node) {
        return `Node ${nodeId} not found`;
    }
    const next = cloneDocument(doc);
    next.nodes[nodeId] = { ...node, data: { ...node.data, ...data } };
    return next;
}
function applySingle(doc, cmd) {
    switch (cmd.type) {
        case "addNode":
            return applyAddNode(doc, cmd.node);
        case "removeNode":
            return applyRemoveNode(doc, cmd.nodeId);
        case "connect":
            return applyConnect(doc, cmd.edge);
        case "disconnect":
            return applyDisconnect(doc, cmd.edgeId);
        case "moveNode":
            return applyMoveNode(doc, cmd.nodeId, cmd.position);
        case "pan":
            return applyPan(doc, cmd.pan);
        case "zoom":
            return applyZoom(doc, cmd.zoom);
        case "updateNodeData":
            return applyUpdateNodeData(doc, cmd.nodeId, cmd.data);
        case "batch":
            return applyBatch(doc, cmd.commands);
    }
}
function applyBatch(doc, commands) {
    let current = doc;
    for (const cmd of commands) {
        const result = applySingle(current, cmd);
        if (typeof result === "string") {
            return result;
        }
        current = result;
    }
    return current;
}
export function executeCommand(state, command) {
    const result = applySingle(state.document, command);
    if (typeof result === "string") {
        return error(state, result);
    }
    return { state: withHistory(state, result) };
}
export function undo(state) {
    if (state.past.length === 0) {
        return error(state, "Nothing to undo");
    }
    const previous = state.past[state.past.length - 1];
    return {
        state: {
            document: previous,
            past: state.past.slice(0, -1),
            future: [state.document, ...state.future],
        },
    };
}
export function redo(state) {
    if (state.future.length === 0) {
        return error(state, "Nothing to redo");
    }
    const next = state.future[0];
    return {
        state: {
            document: next,
            past: [...state.past, state.document],
            future: state.future.slice(1),
        },
    };
}
//# sourceMappingURL=commands.js.map