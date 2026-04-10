/**
 * Type guard for variables with tuning metadata
 */
export function isVariableWithTuning(v) {
    return (typeof v === "object" &&
        v !== null &&
        "value" in v &&
        !("x" in v) &&
        !("expr" in v));
}
/**
 * Check if a variable has tuning metadata
 */
export function isTunable(v) {
    return isVariableWithTuning(v) && v.tuning !== undefined;
}
/**
 * Get the actual value from a GameVariable (handles both formats)
 */
export function getValue(v) {
    return isVariableWithTuning(v) ? v.value : v;
}
/**
 * Get label for a variable (auto-generates from key if not provided)
 */
export function getLabel(key, v) {
    if (isVariableWithTuning(v) && v.label) {
        return v.label;
    }
    // Auto-generate label from key: "jumpForce" → "Jump Force"
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
export function inferKnob(variable) {
    if (variable.knob)
        return variable.knob;
    if (variable.tuning) {
        return {
            controlType: "slider",
            min: variable.tuning.min,
            max: variable.tuning.max,
            step: variable.tuning.step,
        };
    }
    const val = variable.value;
    if (typeof val === "boolean")
        return { controlType: "toggle" };
    if (typeof val === "string" && val.startsWith("#") && val.length === 7)
        return { controlType: "color" };
    return undefined;
}
export const DEFAULT_WORLD_CONFIG = {
    gravity: { x: 0, y: 10 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
};
export const DEFAULT_CAMERA_CONFIG = {
    type: "fixed",
    zoom: 1,
};
//# sourceMappingURL=GameDefinition.js.map