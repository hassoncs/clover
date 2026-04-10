import { z } from 'zod';
export declare const ExpressionValueSchema: z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>;
export declare function valueSchema<T extends z.ZodTypeAny>(innerSchema: T): z.ZodUnion<[T, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>]>;
export declare const NumberValueSchema: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>]>;
export declare const PositiveNumberValueSchema: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>]>;
export declare const NonNegativeNumberValueSchema: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>]>;
export declare const Vec2ValueSchema: z.ZodUnion<[z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>]>;
export declare const TuningConfigSchema: z.ZodObject<{
    min: z.ZodNumber;
    max: z.ZodNumber;
    step: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    min?: number;
    max?: number;
    step?: number;
}, {
    min?: number;
    max?: number;
    step?: number;
}>;
export declare const VariableCategorySchema: z.ZodEnum<["physics", "gameplay", "visuals", "economy", "ai"]>;
export declare const VariableWithTuningSchema: z.ZodObject<{
    value: z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, z.ZodObject<{
        expr: z.ZodString;
        debugName: z.ZodOptional<z.ZodString>;
        cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
    }, "strip", z.ZodTypeAny, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }>]>;
    tuning: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        step: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min?: number;
        max?: number;
        step?: number;
    }, {
        min?: number;
        max?: number;
        step?: number;
    }>>;
    category: z.ZodOptional<z.ZodEnum<["physics", "gameplay", "visuals", "economy", "ai"]>>;
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    display: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}>;
export declare const GameVariableSchema: z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>, z.ZodObject<{
    value: z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, z.ZodObject<{
        expr: z.ZodString;
        debugName: z.ZodOptional<z.ZodString>;
        cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
    }, "strip", z.ZodTypeAny, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }>]>;
    tuning: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        step: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min?: number;
        max?: number;
        step?: number;
    }, {
        min?: number;
        max?: number;
        step?: number;
    }>>;
    category: z.ZodOptional<z.ZodEnum<["physics", "gameplay", "visuals", "economy", "ai"]>>;
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    display: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}>]>;
export declare const GameVariablesSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>, z.ZodObject<{
    expr: z.ZodString;
    debugName: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
}, "strip", z.ZodTypeAny, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}, {
    expr?: string;
    debugName?: string;
    cache?: "none" | "frame";
}>, z.ZodObject<{
    value: z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, z.ZodObject<{
        expr: z.ZodString;
        debugName: z.ZodOptional<z.ZodString>;
        cache: z.ZodOptional<z.ZodEnum<["none", "frame"]>>;
    }, "strip", z.ZodTypeAny, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }, {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    }>]>;
    tuning: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        step: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min?: number;
        max?: number;
        step?: number;
    }, {
        min?: number;
        max?: number;
        step?: number;
    }>>;
    category: z.ZodOptional<z.ZodEnum<["physics", "gameplay", "visuals", "economy", "ai"]>>;
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    display: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}, {
    value?: string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
        x?: number;
        y?: number;
    };
    tuning?: {
        min?: number;
        max?: number;
        step?: number;
    };
    category?: "gameplay" | "physics" | "visuals" | "economy" | "ai";
    label?: string;
    description?: string;
    display?: boolean;
}>]>>;
//# sourceMappingURL=schema-helpers.d.ts.map