import { z } from "zod";
export declare const PenThemeSchema: z.ZodObject<{
    name: z.ZodString;
    values: z.ZodArray<z.ZodString, "many">;
    default: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    values: string[];
    default?: string | undefined;
}, {
    name: string;
    values: string[];
    default?: string | undefined;
}>;
export type PenTheme = z.infer<typeof PenThemeSchema>;
export declare const PenThemedValueSchema: z.ZodObject<{
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean;
    theme?: Record<string, string> | undefined;
}, {
    value: string | number | boolean;
    theme?: Record<string, string> | undefined;
}>;
export type PenThemedValue = z.infer<typeof PenThemedValueSchema>;
export declare const PenVariableSchema: z.ZodObject<{
    type: z.ZodEnum<["color", "number", "string", "boolean"]>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean;
        theme?: Record<string, string> | undefined;
    }, {
        value: string | number | boolean;
        theme?: Record<string, string> | undefined;
    }>, "many">]>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean | {
        value: string | number | boolean;
        theme?: Record<string, string> | undefined;
    }[];
    type: "string" | "number" | "boolean" | "color";
}, {
    value: string | number | boolean | {
        value: string | number | boolean;
        theme?: Record<string, string> | undefined;
    }[];
    type: "string" | "number" | "boolean" | "color";
}>;
export type PenVariable = z.infer<typeof PenVariableSchema>;
export declare const PenSizingSchema: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
export type PenSizing = z.infer<typeof PenSizingSchema>;
export declare const PenGradientStopSchema: z.ZodObject<{
    color: z.ZodString;
    position: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    color: string;
    position: number;
}, {
    color: string;
    position: number;
}>;
export type PenGradientStop = z.infer<typeof PenGradientStopSchema>;
type PenFillPrimitive = string | {
    type: "color";
    color: string;
    opacity?: number;
    enabled?: boolean;
} | {
    type: "gradient";
    gradientType: "linear" | "radial" | "angular" | "mesh";
    stops: PenGradientStop[];
    angle?: number;
    centerX?: number;
    centerY?: number;
    enabled?: boolean;
} | {
    type: "image";
    url: string;
    fit?: "cover" | "contain" | "fill" | "tile";
    opacity?: number;
    enabled?: boolean;
};
export type PenFill = PenFillPrimitive | PenFill[];
export declare const PenFillSchema: z.ZodType<PenFill, z.ZodTypeDef, unknown>;
export declare const PenStrokeSchema: z.ZodObject<{
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
    thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        top: z.ZodNumber;
        right: z.ZodNumber;
        bottom: z.ZodNumber;
        left: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        top: number;
        right: number;
        bottom: number;
        left: number;
    }, {
        top: number;
        right: number;
        bottom: number;
        left: number;
    }>]>>;
    join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
    cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
    dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    join?: "miter" | "round" | "bevel" | undefined;
    fill?: PenFill | undefined;
    enabled?: boolean | undefined;
    align?: "center" | "inside" | "outside" | undefined;
    thickness?: number | {
        top: number;
        right: number;
        bottom: number;
        left: number;
    } | undefined;
    cap?: "round" | "butt" | "square" | undefined;
    dashPattern?: number[] | undefined;
}, {
    join?: "miter" | "round" | "bevel" | undefined;
    fill?: unknown;
    enabled?: boolean | undefined;
    align?: "center" | "inside" | "outside" | undefined;
    thickness?: number | {
        top: number;
        right: number;
        bottom: number;
        left: number;
    } | undefined;
    cap?: "round" | "butt" | "square" | undefined;
    dashPattern?: number[] | undefined;
}>;
export type PenStroke = z.infer<typeof PenStrokeSchema>;
export declare const PenShadowSchema: z.ZodObject<{
    color: z.ZodString;
    offsetX: z.ZodNumber;
    offsetY: z.ZodNumber;
    blur: z.ZodNumber;
    spread: z.ZodOptional<z.ZodNumber>;
    inner: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    enabled?: boolean | undefined;
    spread?: number | undefined;
    inner?: boolean | undefined;
}, {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    enabled?: boolean | undefined;
    spread?: number | undefined;
    inner?: boolean | undefined;
}>;
export type PenShadow = z.infer<typeof PenShadowSchema>;
export declare const PenEffectSchema: z.ZodObject<{
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
        spread: z.ZodOptional<z.ZodNumber>;
        inner: z.ZodOptional<z.ZodBoolean>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        color: string;
        offsetX: number;
        offsetY: number;
        blur: number;
        enabled?: boolean | undefined;
        spread?: number | undefined;
        inner?: boolean | undefined;
    }, {
        color: string;
        offsetX: number;
        offsetY: number;
        blur: number;
        enabled?: boolean | undefined;
        spread?: number | undefined;
        inner?: boolean | undefined;
    }>>;
    blur: z.ZodOptional<z.ZodNumber>;
    background_blur: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    blur?: number | undefined;
    shadow?: {
        color: string;
        offsetX: number;
        offsetY: number;
        blur: number;
        enabled?: boolean | undefined;
        spread?: number | undefined;
        inner?: boolean | undefined;
    } | undefined;
    background_blur?: number | undefined;
}, {
    enabled?: boolean | undefined;
    blur?: number | undefined;
    shadow?: {
        color: string;
        offsetX: number;
        offsetY: number;
        blur: number;
        enabled?: boolean | undefined;
        spread?: number | undefined;
        inner?: boolean | undefined;
    } | undefined;
    background_blur?: number | undefined;
}>;
export type PenEffect = z.infer<typeof PenEffectSchema>;
export declare const PenPaddingSchema: z.ZodUnion<[z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>]>;
export type PenPadding = z.infer<typeof PenPaddingSchema>;
export declare const PenTextSpanSchema: z.ZodObject<{
    content: z.ZodString;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontWeight: z.ZodOptional<z.ZodString>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    fill?: PenFill | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: string | undefined;
    fontStyle?: "normal" | "italic" | undefined;
}, {
    content: string;
    fill?: unknown;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: string | undefined;
    fontStyle?: "normal" | "italic" | undefined;
}>;
export type PenTextSpan = z.infer<typeof PenTextSpanSchema>;
export declare const PenRectangleSchema: z.ZodObject<{
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    stroke: z.ZodOptional<z.ZodObject<{
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
        align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
        thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }>]>>;
        join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
        cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }>>;
    cornerRadius: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>]>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
            spread: z.ZodOptional<z.ZodNumber>;
            inner: z.ZodOptional<z.ZodBoolean>;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }>>;
        blur: z.ZodOptional<z.ZodNumber>;
        background_blur: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }>, "many">>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"rectangle">;
}, "strip", z.ZodTypeAny, {
    type: "rectangle";
    id: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    cornerRadius?: number | [number, number, number, number] | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}, {
    type: "rectangle";
    id: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    cornerRadius?: number | [number, number, number, number] | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}>;
export type PenRectangle = z.infer<typeof PenRectangleSchema>;
export declare const PenEllipseSchema: z.ZodObject<{
    innerRadius: z.ZodOptional<z.ZodNumber>;
    startAngle: z.ZodOptional<z.ZodNumber>;
    sweepAngle: z.ZodOptional<z.ZodNumber>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    stroke: z.ZodOptional<z.ZodObject<{
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
        align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
        thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }>]>>;
        join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
        cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
            spread: z.ZodOptional<z.ZodNumber>;
            inner: z.ZodOptional<z.ZodBoolean>;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }>>;
        blur: z.ZodOptional<z.ZodNumber>;
        background_blur: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }>, "many">>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"ellipse">;
}, "strip", z.ZodTypeAny, {
    type: "ellipse";
    id: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    innerRadius?: number | undefined;
    startAngle?: number | undefined;
    sweepAngle?: number | undefined;
}, {
    type: "ellipse";
    id: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    innerRadius?: number | undefined;
    startAngle?: number | undefined;
    sweepAngle?: number | undefined;
}>;
export type PenEllipse = z.infer<typeof PenEllipseSchema>;
export declare const PenLineSchema: z.ZodObject<{
    stroke: z.ZodOptional<z.ZodObject<{
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
        align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
        thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }>]>>;
        join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
        cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }>>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"line">;
}, "strip", z.ZodTypeAny, {
    type: "line";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}, {
    type: "line";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}>;
export type PenLine = z.infer<typeof PenLineSchema>;
export declare const PenPolygonSchema: z.ZodObject<{
    polygonCount: z.ZodOptional<z.ZodNumber>;
    cornerRadius: z.ZodOptional<z.ZodNumber>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    stroke: z.ZodOptional<z.ZodObject<{
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
        align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
        thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }>]>>;
        join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
        cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
            spread: z.ZodOptional<z.ZodNumber>;
            inner: z.ZodOptional<z.ZodBoolean>;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }>>;
        blur: z.ZodOptional<z.ZodNumber>;
        background_blur: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }>, "many">>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"polygon">;
}, "strip", z.ZodTypeAny, {
    type: "polygon";
    id: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    cornerRadius?: number | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    polygonCount?: number | undefined;
}, {
    type: "polygon";
    id: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    cornerRadius?: number | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    polygonCount?: number | undefined;
}>;
export type PenPolygon = z.infer<typeof PenPolygonSchema>;
export declare const PenPathSchema: z.ZodObject<{
    geometry: z.ZodString;
    fillRule: z.ZodOptional<z.ZodEnum<["nonzero", "evenodd"]>>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    stroke: z.ZodOptional<z.ZodObject<{
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
        align: z.ZodOptional<z.ZodEnum<["center", "inside", "outside"]>>;
        thickness: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }, {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }>]>>;
        join: z.ZodOptional<z.ZodEnum<["miter", "round", "bevel"]>>;
        cap: z.ZodOptional<z.ZodEnum<["butt", "round", "square"]>>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    }>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
            spread: z.ZodOptional<z.ZodNumber>;
            inner: z.ZodOptional<z.ZodBoolean>;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }>>;
        blur: z.ZodOptional<z.ZodNumber>;
        background_blur: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }>, "many">>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"path">;
}, "strip", z.ZodTypeAny, {
    type: "path";
    id: string;
    geometry: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: PenFill | undefined;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    fillRule?: "nonzero" | "evenodd" | undefined;
}, {
    type: "path";
    id: string;
    geometry: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    stroke?: {
        join?: "miter" | "round" | "bevel" | undefined;
        fill?: unknown;
        enabled?: boolean | undefined;
        align?: "center" | "inside" | "outside" | undefined;
        thickness?: number | {
            top: number;
            right: number;
            bottom: number;
            left: number;
        } | undefined;
        cap?: "round" | "butt" | "square" | undefined;
        dashPattern?: number[] | undefined;
    } | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    fillRule?: "nonzero" | "evenodd" | undefined;
}>;
export type PenPath = z.infer<typeof PenPathSchema>;
export declare const PenTextSchema: z.ZodObject<{
    content: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontWeight: z.ZodOptional<z.ZodString>;
        fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
        fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        fill?: PenFill | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: string | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }, {
        content: string;
        fill?: unknown;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: string | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }>, "many">]>;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontWeight: z.ZodOptional<z.ZodString>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    lineHeight: z.ZodOptional<z.ZodNumber>;
    letterSpacing: z.ZodOptional<z.ZodNumber>;
    textAlign: z.ZodOptional<z.ZodEnum<["left", "center", "right", "justify"]>>;
    textAlignVertical: z.ZodOptional<z.ZodEnum<["top", "center", "bottom"]>>;
    textGrowth: z.ZodOptional<z.ZodEnum<["fixed", "fit_width", "fit_height", "fit_both"]>>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"text">;
}, "strip", z.ZodTypeAny, {
    type: "text";
    content: string | {
        content: string;
        fill?: PenFill | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: string | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }[];
    id: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: string | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    lineHeight?: number | undefined;
    letterSpacing?: number | undefined;
    textAlign?: "center" | "right" | "left" | "justify" | undefined;
    textAlignVertical?: "center" | "top" | "bottom" | undefined;
    textGrowth?: "fixed" | "fit_width" | "fit_height" | "fit_both" | undefined;
}, {
    type: "text";
    content: string | {
        content: string;
        fill?: unknown;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: string | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }[];
    id: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: string | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    lineHeight?: number | undefined;
    letterSpacing?: number | undefined;
    textAlign?: "center" | "right" | "left" | "justify" | undefined;
    textAlignVertical?: "center" | "top" | "bottom" | undefined;
    textGrowth?: "fixed" | "fit_width" | "fit_height" | "fit_both" | undefined;
}>;
export type PenText = z.infer<typeof PenTextSchema>;
export declare const PenIconFontSchema: z.ZodObject<{
    icon: z.ZodString;
    iconFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fill: z.ZodOptional<z.ZodType<PenFill, z.ZodTypeDef, unknown>>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"icon_font">;
}, "strip", z.ZodTypeAny, {
    type: "icon_font";
    id: string;
    icon: string;
    name?: string | undefined;
    fill?: PenFill | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fontSize?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    iconFamily?: string | undefined;
}, {
    type: "icon_font";
    id: string;
    icon: string;
    name?: string | undefined;
    fill?: unknown;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fontSize?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    iconFamily?: string | undefined;
}>;
export type PenIconFont = z.infer<typeof PenIconFontSchema>;
export declare const PenRefSchema: z.ZodObject<{
    ref: z.ZodString;
    descendants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    reusable: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"ref">;
}, "strip", z.ZodTypeAny, {
    type: "ref";
    id: string;
    ref: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    descendants?: Record<string, unknown> | undefined;
    reusable?: boolean | undefined;
}, {
    type: "ref";
    id: string;
    ref: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    descendants?: Record<string, unknown> | undefined;
    reusable?: boolean | undefined;
}>;
export type PenRef = z.infer<typeof PenRefSchema>;
export declare const PenNoteSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"note">;
}, "strip", z.ZodTypeAny, {
    type: "note";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    content?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}, {
    type: "note";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    content?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}>;
export type PenNote = z.infer<typeof PenNoteSchema>;
export declare const PenImageSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    fit: z.ZodOptional<z.ZodEnum<["cover", "contain", "fill"]>>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
            spread: z.ZodOptional<z.ZodNumber>;
            inner: z.ZodOptional<z.ZodBoolean>;
            enabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }, {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        }>>;
        blur: z.ZodOptional<z.ZodNumber>;
        background_blur: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }>, "many">>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"image">;
}, "strip", z.ZodTypeAny, {
    type: "image";
    id: string;
    name?: string | undefined;
    url?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fit?: "fill" | "cover" | "contain" | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}, {
    type: "image";
    id: string;
    name?: string | undefined;
    url?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    fit?: "fill" | "cover" | "contain" | undefined;
    effects?: {
        enabled?: boolean | undefined;
        blur?: number | undefined;
        shadow?: {
            color: string;
            offsetX: number;
            offsetY: number;
            blur: number;
            enabled?: boolean | undefined;
            spread?: number | undefined;
            inner?: boolean | undefined;
        } | undefined;
        background_blur?: number | undefined;
    }[] | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}>;
export type PenImage = z.infer<typeof PenImageSchema>;
export declare const PenEffectNodeSchema: z.ZodObject<{
    shaderCode: z.ZodOptional<z.ZodString>;
    playing: z.ZodOptional<z.ZodBoolean>;
    authoringMode: z.ZodOptional<z.ZodString>;
    uniforms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"effect">;
}, "strip", z.ZodTypeAny, {
    type: "effect";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    shaderCode?: string | undefined;
    playing?: boolean | undefined;
    authoringMode?: string | undefined;
    uniforms?: Record<string, any> | undefined;
}, {
    type: "effect";
    id: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
    shaderCode?: string | undefined;
    playing?: boolean | undefined;
    authoringMode?: string | undefined;
    uniforms?: Record<string, any> | undefined;
}>;
export type PenEffectNode = z.infer<typeof PenEffectNodeSchema>;
export declare const PenConnectionSchema: z.ZodObject<{
    fromId: z.ZodString;
    toId: z.ZodString;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    flipX: z.ZodOptional<z.ZodBoolean>;
    flipY: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    visible: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"connection">;
}, "strip", z.ZodTypeAny, {
    type: "connection";
    id: string;
    fromId: string;
    toId: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}, {
    type: "connection";
    id: string;
    fromId: string;
    toId: string;
    name?: string | undefined;
    theme?: Record<string, string> | undefined;
    opacity?: number | undefined;
    enabled?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    rotation?: number | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    visible?: boolean | undefined;
    createdAt?: number | undefined;
}>;
export type PenConnection = z.infer<typeof PenConnectionSchema>;
export interface PenFrame {
    type: "frame";
    id: string;
    name?: string;
    x?: number;
    y?: number;
    width?: PenSizing;
    height?: PenSizing;
    rotation?: number;
    opacity?: number;
    flipX?: boolean;
    flipY?: boolean;
    enabled?: boolean;
    theme?: Record<string, string>;
    visible?: boolean;
    layout?: "none" | "horizontal" | "vertical";
    children?: PenNode[];
    gap?: number;
    padding?: PenPadding;
    justifyContent?: "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
    alignItems?: "start" | "center" | "end" | "stretch";
    fill?: PenFill;
    stroke?: PenStroke;
    cornerRadius?: number | [number, number, number, number];
    clip?: boolean;
    effects?: PenEffect[];
    reusable?: boolean;
    slot?: boolean;
    placeholder?: boolean;
    aiGenerating?: boolean;
    createdAt?: number;
}
export interface PenGroup {
    type: "group";
    id: string;
    name?: string;
    x?: number;
    y?: number;
    width?: PenSizing;
    height?: PenSizing;
    rotation?: number;
    opacity?: number;
    flipX?: boolean;
    flipY?: boolean;
    enabled?: boolean;
    theme?: Record<string, string>;
    visible?: boolean;
    children?: PenNode[];
    layout?: "none" | "horizontal" | "vertical";
    gap?: number;
    padding?: PenPadding;
    createdAt?: number;
}
export type PenNode = PenFrame | PenGroup | PenRectangle | PenEllipse | PenLine | PenPolygon | PenPath | PenText | PenIconFont | PenRef | PenNote | PenImage | PenEffectNode | PenConnection;
export declare const PenFrameSchema: z.ZodType<PenFrame, z.ZodTypeDef, unknown>;
export declare const PenGroupSchema: z.ZodType<PenGroup, z.ZodTypeDef, unknown>;
export declare const PenNodeSchema: z.ZodType<PenNode, z.ZodTypeDef, unknown>;
export declare const PenDocumentSchema: z.ZodObject<{
    version: z.ZodNumber;
    themes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        values: z.ZodArray<z.ZodString, "many">;
        default: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        values: string[];
        default?: string | undefined;
    }, {
        name: string;
        values: string[];
        default?: string | undefined;
    }>, "many">>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<["color", "number", "string", "boolean"]>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            theme: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }, {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }>, "many">]>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean | {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }[];
        type: "string" | "number" | "boolean" | "color";
    }, {
        value: string | number | boolean | {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }[];
        type: "string" | "number" | "boolean" | "color";
    }>>>;
    children: z.ZodArray<z.ZodType<PenNode, z.ZodTypeDef, unknown>, "many">;
}, "strip", z.ZodTypeAny, {
    children: PenNode[];
    version: number;
    themes?: {
        name: string;
        values: string[];
        default?: string | undefined;
    }[] | undefined;
    variables?: Record<string, {
        value: string | number | boolean | {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }[];
        type: "string" | "number" | "boolean" | "color";
    }> | undefined;
}, {
    children: unknown[];
    version: number;
    themes?: {
        name: string;
        values: string[];
        default?: string | undefined;
    }[] | undefined;
    variables?: Record<string, {
        value: string | number | boolean | {
            value: string | number | boolean;
            theme?: Record<string, string> | undefined;
        }[];
        type: "string" | "number" | "boolean" | "color";
    }> | undefined;
}>;
export type PenDocument = {
    version: number;
    themes?: PenTheme[];
    variables?: Record<string, PenVariable>;
    children: PenNode[];
};
export declare function parsePenDocument(data: unknown): PenDocument;
export {};
//# sourceMappingURL=pen.d.ts.map