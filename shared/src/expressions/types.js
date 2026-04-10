export function isExpression(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'expr' in value &&
        typeof value.expr === 'string');
}
//# sourceMappingURL=types.js.map