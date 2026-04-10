import type { PropertyValue, PropertyMetadata } from './types';
import type { Vec2 } from '../types';
export declare class TypeCoercion {
    static coerceToExpectedType(value: unknown, metadata: PropertyMetadata): PropertyValue;
    static coerceToNumber(value: unknown): number | undefined;
    static coerceToString(value: unknown): string | undefined;
    static coerceToBoolean(value: unknown): boolean | undefined;
    static coerceToVec2(value: unknown): Vec2 | undefined;
    static isVec2(value: unknown): value is Vec2;
    static validate(value: PropertyValue, metadata: PropertyMetadata): {
        valid: boolean;
        error?: string;
    };
    static inferType(value: unknown): PropertyMetadata['type'];
}
//# sourceMappingURL=TypeCoercion.d.ts.map