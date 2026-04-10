export class TypeCoercion {
    static coerceToExpectedType(value, metadata) {
        if (value === null || value === undefined) {
            return undefined;
        }
        switch (metadata.type) {
            case 'number':
                return this.coerceToNumber(value);
            case 'string':
                return this.coerceToString(value);
            case 'boolean':
                return this.coerceToBoolean(value);
            case 'vec2':
                return this.coerceToVec2(value);
            case 'entity':
            case 'entity[]':
                return this.coerceToString(value);
            default:
                return value;
        }
    }
    static coerceToNumber(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : undefined;
        }
        if (typeof value === 'string') {
            const num = Number(value);
            return Number.isFinite(num) ? num : undefined;
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        return undefined;
    }
    static coerceToString(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return undefined;
    }
    static coerceToBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1')
                return true;
            if (lower === 'false' || lower === '0')
                return false;
            return undefined;
        }
        return undefined;
    }
    static coerceToVec2(value) {
        if (this.isVec2(value)) {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('x' in obj && 'y' in obj) {
                const x = this.coerceToNumber(obj.x);
                const y = this.coerceToNumber(obj.y);
                if (x !== undefined && y !== undefined) {
                    return { x, y };
                }
            }
        }
        return undefined;
    }
    static isVec2(value) {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const obj = value;
        return ('x' in obj &&
            'y' in obj &&
            typeof obj.x === 'number' &&
            typeof obj.y === 'number');
    }
    static validate(value, metadata) {
        if (value === undefined) {
            return { valid: true };
        }
        switch (metadata.type) {
            case 'number':
                if (typeof value !== 'number') {
                    return { valid: false, error: `Expected number, got ${typeof value}` };
                }
                if (!Number.isFinite(value)) {
                    return { valid: false, error: 'Expected finite number' };
                }
                return { valid: true };
            case 'string':
                if (typeof value !== 'string') {
                    return { valid: false, error: `Expected string, got ${typeof value}` };
                }
                return { valid: true };
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { valid: false, error: `Expected boolean, got ${typeof value}` };
                }
                return { valid: true };
            case 'vec2':
                if (!this.isVec2(value)) {
                    return { valid: false, error: 'Expected Vec2 {x, y}' };
                }
                return { valid: true };
            case 'entity':
            case 'entity[]':
                if (typeof value !== 'string') {
                    return { valid: false, error: `Expected entity ID (string), got ${typeof value}` };
                }
                return { valid: true };
            default:
                return { valid: true };
        }
    }
    static inferType(value) {
        if (typeof value === 'number') {
            return 'number';
        }
        if (typeof value === 'string') {
            return 'string';
        }
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (this.isVec2(value)) {
            return 'vec2';
        }
        return 'string';
    }
}
//# sourceMappingURL=TypeCoercion.js.map