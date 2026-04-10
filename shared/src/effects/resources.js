// ---------------------------------------------------------------------------
// Format & resolution compatibility
// ---------------------------------------------------------------------------
export function areFormatsCompatible(source, target) {
    if (source === target)
        return true;
    if (source === 'rgba16f' && target === 'rgba8')
        return true;
    return false;
}
export function areResolutionsCompatible(source, target) {
    if (source === target)
        return true;
    const order = { full: 0, half: 1, quarter: 2, custom: -1 };
    if (source === 'custom' || target === 'custom')
        return false;
    return order[source] <= order[target];
}
export function resolveEffectiveResolution(mode, customWidth, customHeight) {
    switch (mode) {
        case 'full':
            return { widthScale: 1.0, heightScale: 1.0 };
        case 'half':
            return { widthScale: 0.5, heightScale: 0.5 };
        case 'quarter':
            return { widthScale: 0.25, heightScale: 0.25 };
        case 'custom':
            return {
                widthScale: customWidth ?? 1.0,
                heightScale: customHeight ?? 1.0,
            };
    }
}
// ---------------------------------------------------------------------------
// Resource ID generation — deterministic from node + output name
// ---------------------------------------------------------------------------
function makeResourceId(nodeId, outputName) {
    return `${nodeId}:${outputName}`;
}
function makeNamedBufferId(bufferId) {
    return `__named:${bufferId}`;
}
function makeImplicitInputId(scope) {
    // Entity scope now uses externalInputs instead of implicit __entityTexture
    return '__screenColor';
}
function makeFeedbackResourceId(fromNodeId, toNodeId) {
    return `__feedback:${fromNodeId}->${toNodeId}`;
}
// ---------------------------------------------------------------------------
// buildResourceGraph — build a resource graph from an EffectGraphSpec
// ---------------------------------------------------------------------------
export function buildResourceGraph(spec) {
    const errors = [];
    const resources = new Map();
    const bindings = [];
    const scope = spec.scope === 'screen'
        ? { type: 'screen' }
        : { type: 'entity', entityId: '' };
    const nodeMap = new Map();
    for (const node of spec.nodes) {
        nodeMap.set(node.id, node);
    }
    const implicitInputId = makeImplicitInputId(spec.scope);
    const implicitKind = 'screenColor';
    resources.set(implicitInputId, {
        id: implicitInputId,
        kind: implicitKind,
        format: 'rgba8',
        resolution: 'full',
        providedBy: null,
        consumedBy: [],
    });
    if (spec.externalInputs) {
        for (const extInput of spec.externalInputs) {
            const extResourceId = `__external:${extInput.name}`;
            resources.set(extResourceId, {
                id: extResourceId,
                kind: 'external',
                format: 'rgba8',
                resolution: 'full',
                providedBy: null,
                consumedBy: [],
            });
        }
    }
    const outputResourceMap = new Map();
    const namedBufferMap = new Map();
    for (const node of spec.nodes) {
        const resId = makeResourceId(node.id, node.outputTarget.bufferId);
        if (resources.has(resId)) {
            errors.push({
                code: 'E_DUPLICATE_PROVIDER',
                message: `Resource '${resId}' already has a provider`,
                resourceId: resId,
                nodeIds: [resources.get(resId).providedBy, node.id],
            });
            continue;
        }
        resources.set(resId, {
            id: resId,
            kind: 'intermediate',
            format: node.outputTarget.format,
            resolution: node.outputTarget.resolution,
            customWidth: node.outputTarget.customWidth,
            customHeight: node.outputTarget.customHeight,
            providedBy: node.id,
            consumedBy: [],
        });
        const outputKey = `${node.id}:${node.outputTarget.bufferId}`;
        outputResourceMap.set(outputKey, resId);
        bindings.push({
            passId: node.id,
            direction: 'output',
            slotName: node.outputTarget.bufferId,
            resourceId: resId,
        });
        if (node.outputs) {
            for (const output of node.outputs) {
                const namedBufferId = makeNamedBufferId(output.bufferId);
                if (!resources.has(namedBufferId)) {
                    resources.set(namedBufferId, {
                        id: namedBufferId,
                        kind: 'intermediate',
                        format: node.outputTarget.format,
                        resolution: node.outputTarget.resolution,
                        customWidth: node.outputTarget.customWidth,
                        customHeight: node.outputTarget.customHeight,
                        providedBy: node.id,
                        consumedBy: [],
                    });
                }
                else {
                    errors.push({
                        code: 'E_DUPLICATE_PROVIDER',
                        message: `Named buffer '${output.bufferId}' already has a provider`,
                        resourceId: namedBufferId,
                        nodeIds: [resources.get(namedBufferId).providedBy, node.id],
                    });
                    continue;
                }
                namedBufferMap.set(output.bufferId, namedBufferId);
                bindings.push({
                    passId: node.id,
                    direction: 'output',
                    slotName: output.name,
                    resourceId: namedBufferId,
                });
            }
        }
    }
    for (const fb of spec.feedbackEdges) {
        const feedbackResId = makeFeedbackResourceId(fb.from.nodeId, fb.to.nodeId);
        resources.set(feedbackResId, {
            id: feedbackResId,
            kind: 'feedback',
            format: fb.policy.bufferFormat,
            resolution: 'full',
            providedBy: fb.from.nodeId,
            consumedBy: [fb.to.nodeId],
        });
        bindings.push({
            passId: fb.from.nodeId,
            direction: 'output',
            slotName: fb.from.output,
            resourceId: feedbackResId,
        });
        bindings.push({
            passId: fb.to.nodeId,
            direction: 'input',
            slotName: fb.to.input,
            resourceId: feedbackResId,
        });
    }
    for (const conn of spec.connections) {
        const sourceKey = `${conn.from.nodeId}:${conn.from.output}`;
        let sourceResId = outputResourceMap.get(sourceKey);
        if (!sourceResId) {
            const namedBufferId = makeNamedBufferId(conn.from.output);
            if (resources.has(namedBufferId)) {
                sourceResId = namedBufferId;
            }
        }
        if (!sourceResId) {
            errors.push({
                code: 'E_RESOURCE_UNRESOLVED',
                message: `Input '${conn.to.input}' on node '${conn.to.nodeId}' connects to non-existent output '${conn.from.output}' on node '${conn.from.nodeId}'`,
                resourceId: sourceKey,
                nodeIds: [conn.from.nodeId, conn.to.nodeId],
            });
            continue;
        }
        const sourceResource = resources.get(sourceResId);
        const targetNode = nodeMap.get(conn.to.nodeId);
        if (targetNode) {
            const targetSlot = targetNode.inputSlots.find((s) => s.name === conn.to.input);
            if (targetSlot && targetSlot.dataType === 'texture') {
                const targetOutputFormat = targetNode.outputTarget.format;
                if (!areFormatsCompatible(sourceResource.format, targetOutputFormat)) {
                    errors.push({
                        code: 'E_FORMAT_MISMATCH',
                        message: `Format mismatch: source '${conn.from.nodeId}' outputs ${sourceResource.format} but target '${conn.to.nodeId}' expects compatible format (has ${targetOutputFormat})`,
                        resourceId: sourceResId,
                        nodeIds: [conn.from.nodeId, conn.to.nodeId],
                    });
                }
                if (!areResolutionsCompatible(sourceResource.resolution, targetNode.outputTarget.resolution)) {
                    errors.push({
                        code: 'E_RESOLUTION_MISMATCH',
                        message: `Resolution mismatch: source '${conn.from.nodeId}' outputs ${sourceResource.resolution} but target '${conn.to.nodeId}' has ${targetNode.outputTarget.resolution}`,
                        resourceId: sourceResId,
                        nodeIds: [conn.from.nodeId, conn.to.nodeId],
                    });
                }
            }
        }
        sourceResource.consumedBy.push(conn.to.nodeId);
        bindings.push({
            passId: conn.to.nodeId,
            direction: 'input',
            slotName: conn.to.input,
            resourceId: sourceResId,
        });
    }
    for (const node of spec.nodes) {
        for (const slot of node.inputSlots) {
            const isFeedbackInput = spec.feedbackEdges.some((fb) => fb.to.nodeId === node.id && fb.to.input === slot.name);
            if (isFeedbackInput)
                continue;
            const isConnected = spec.connections.some((c) => c.to.nodeId === node.id && c.to.input === slot.name);
            if (isConnected)
                continue;
            const hasBinding = bindings.some((b) => b.passId === node.id && b.direction === 'input' && b.slotName === slot.name);
            if (!hasBinding) {
                const externalInput = spec.externalInputs?.find((ext) => ext.name === slot.name);
                if (externalInput) {
                    const extResourceId = `__external:${externalInput.name}`;
                    const extResource = resources.get(extResourceId);
                    if (extResource) {
                        extResource.consumedBy.push(node.id);
                        bindings.push({
                            passId: node.id,
                            direction: 'input',
                            slotName: slot.name,
                            resourceId: extResourceId,
                        });
                    }
                }
                else {
                    const implicitResource = resources.get(implicitInputId);
                    if (implicitResource) {
                        implicitResource.consumedBy.push(node.id);
                        bindings.push({
                            passId: node.id,
                            direction: 'input',
                            slotName: slot.name,
                            resourceId: implicitInputId,
                        });
                    }
                }
            }
        }
    }
    if (errors.length > 0) {
        return { success: false, errors };
    }
    return {
        success: true,
        graph: { scope, resources, bindings },
        errors: [],
    };
}
//# sourceMappingURL=resources.js.map