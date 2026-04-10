export function resolveSlots(selections, registry) {
    const resolved = new Map();
    const errors = [];
    for (const [key, selection] of Object.entries(selections)) {
        const impl = registry.get(selection.implId);
        if (!impl) {
            errors.push(`Slot implementation '${selection.implId}' not found for slot '${key}'`);
            continue;
        }
        const isValid = registry.validateSelection(selection.systemId, selection.slotName, selection.implId);
        if (!isValid) {
            errors.push(`Implementation '${selection.implId}' is not valid for slot '${selection.systemId}.${selection.slotName}'`);
            continue;
        }
        resolved.set(key, {
            systemId: selection.systemId,
            slotName: selection.slotName,
            implementation: impl,
            params: selection.params,
        });
    }
    return { slots: resolved, errors };
}
export function resolveSlotRef(ref, registry) {
    return registry.get(ref);
}
export function createSlotSelection(systemId, slotName, implId, params) {
    return { systemId, slotName, implId, params };
}
//# sourceMappingURL=resolver.js.map