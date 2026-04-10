import { z } from "zod";
/**
 * Reference to a constant defined in GameDefinition.constants.
 * Used in bundle format to reference values by name instead of hardcoding.
 * Example: { const: "GRAVITY" } resolves to the value of constants.GRAVITY
 */
export declare const ConstantRefSchema: z.ZodObject<{
    const: z.ZodString;
}, "strip", z.ZodTypeAny, {
    const?: string;
}, {
    const?: string;
}>;
export type ConstantRef = z.infer<typeof ConstantRefSchema>;
/**
 * Union type: either a number or a constant reference
 */
export declare const NumberOrConstantSchema: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
    const: z.ZodString;
}, "strip", z.ZodTypeAny, {
    const?: string;
}, {
    const?: string;
}>]>;
export type NumberOrConstant = z.infer<typeof NumberOrConstantSchema>;
/**
 * Union type: either a string or a constant reference
 */
export declare const StringOrConstantSchema: z.ZodUnion<[z.ZodString, z.ZodObject<{
    const: z.ZodString;
}, "strip", z.ZodTypeAny, {
    const?: string;
}, {
    const?: string;
}>]>;
export type StringOrConstant = z.infer<typeof StringOrConstantSchema>;
export declare const Vec2Schema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>;
export declare const BoundsSchema: z.ZodObject<{
    minX: z.ZodNumber;
    maxX: z.ZodNumber;
    minY: z.ZodNumber;
    maxY: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
}, {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
}>;
export declare const ShadowEffectSchema: z.ZodObject<{
    color: z.ZodString;
    offsetX: z.ZodNumber;
    offsetY: z.ZodNumber;
    blur: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    color?: string;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
}, {
    color?: string;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
}>;
export declare const RectVisualSchema: z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>;
export declare const CircleVisualSchema: z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    radius: z.ZodOptional<z.ZodNumber>;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>;
export declare const PolygonVisualSchema: z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"polygon">;
    vertices: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}>;
export declare const ImageVisualSchema: z.ZodObject<{
    color: z.ZodOptional<z.ZodString>;
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    whatDescription: z.ZodOptional<z.ZodString>;
    tint: z.ZodOptional<z.ZodString>;
    imageWidth: z.ZodOptional<z.ZodNumber>;
    imageHeight: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
    scale: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}>;
export declare const TextVisualSchema: z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}>;
export declare const VisualComponentSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    radius: z.ZodOptional<z.ZodNumber>;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"polygon">;
    vertices: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}>, z.ZodObject<{
    color: z.ZodOptional<z.ZodString>;
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    whatDescription: z.ZodOptional<z.ZodString>;
    tint: z.ZodOptional<z.ZodString>;
    imageWidth: z.ZodOptional<z.ZodNumber>;
    imageHeight: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
    scale: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}>]>;
export declare const SpriteComponentSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "rect";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    radius: z.ZodOptional<z.ZodNumber>;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}, {
    color?: string;
    type?: "circle";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    radius?: number;
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"polygon">;
    vertices: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}, {
    color?: string;
    type?: "polygon";
    height?: number;
    width?: number;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    vertices?: {
        x?: number;
        y?: number;
    }[];
}>, z.ZodObject<{
    color: z.ZodOptional<z.ZodString>;
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    whatDescription: z.ZodOptional<z.ZodString>;
    tint: z.ZodOptional<z.ZodString>;
    imageWidth: z.ZodOptional<z.ZodNumber>;
    imageHeight: z.ZodOptional<z.ZodNumber>;
    url: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
    scale: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}, {
    color?: string;
    type?: "image";
    height?: number;
    width?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetId?: string;
    blendMode?: "sub" | "mix" | "add" | "mul";
    tint?: string;
    opacity?: number;
    whatDescription?: string;
    url?: string;
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    strokeColor?: string;
    imageWidth?: number;
    imageHeight?: number;
}>, z.ZodObject<{
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
    shadow: z.ZodOptional<z.ZodObject<{
        color: z.ZodString;
        offsetX: z.ZodNumber;
        offsetY: z.ZodNumber;
        blur: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }, {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}, {
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    text?: string;
    offsetX?: number;
    offsetY?: number;
    blendMode?: "sub" | "mix" | "add" | "mul";
    opacity?: number;
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
}>]>;
export declare const PhysicsComponentSchema: z.ZodObject<{
    bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
    density: z.ZodOptional<z.ZodNumber>;
    mass: z.ZodOptional<z.ZodNumber>;
    gravityScale: z.ZodOptional<z.ZodNumber>;
    linearDamping: z.ZodOptional<z.ZodNumber>;
    angularDamping: z.ZodOptional<z.ZodNumber>;
    fixedRotation: z.ZodOptional<z.ZodBoolean>;
    ccd: z.ZodOptional<z.ZodBoolean>;
    initialVelocity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    bodyType?: "kinematic" | "static" | "dynamic";
    mass?: number;
    density?: number;
    gravityScale?: number;
    linearDamping?: number;
    angularDamping?: number;
    fixedRotation?: boolean;
    ccd?: boolean;
    initialVelocity?: {
        x?: number;
        y?: number;
    };
    initialAngularVelocity?: number;
}, {
    bodyType?: "kinematic" | "static" | "dynamic";
    mass?: number;
    density?: number;
    gravityScale?: number;
    linearDamping?: number;
    angularDamping?: number;
    fixedRotation?: boolean;
    ccd?: boolean;
    initialVelocity?: {
        x?: number;
        y?: number;
    };
    initialAngularVelocity?: number;
}>;
export declare const BoxColliderSchema: z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"box">;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    height?: number;
    width?: number;
    shape?: "box";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    height?: number;
    width?: number;
    shape?: "box";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>;
export declare const CircleColliderSchema: z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"circle">;
    radius: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    radius?: number;
    shape?: "circle";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    radius?: number;
    shape?: "circle";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>;
export declare const PolygonColliderSchema: z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"polygon">;
    vertices: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    shape?: "polygon";
    vertices?: {
        x?: number;
        y?: number;
    }[];
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    shape?: "polygon";
    vertices?: {
        x?: number;
        y?: number;
    }[];
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>;
export declare const CapsuleColliderSchema: z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"capsule">;
    radius: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    height?: number;
    radius?: number;
    shape?: "capsule";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    height?: number;
    radius?: number;
    shape?: "capsule";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>;
export declare const ColliderComponentSchema: z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"box">;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    height?: number;
    width?: number;
    shape?: "box";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    height?: number;
    width?: number;
    shape?: "box";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>, z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"circle">;
    radius: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    radius?: number;
    shape?: "circle";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    radius?: number;
    shape?: "circle";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>, z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"polygon">;
    vertices: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    shape?: "polygon";
    vertices?: {
        x?: number;
        y?: number;
    }[];
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    shape?: "polygon";
    vertices?: {
        x?: number;
        y?: number;
    }[];
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>, z.ZodObject<{
    friction: z.ZodOptional<z.ZodNumber>;
    restitution: z.ZodOptional<z.ZodNumber>;
    isSensor: z.ZodOptional<z.ZodBoolean>;
    categoryBits: z.ZodOptional<z.ZodNumber>;
    maskBits: z.ZodOptional<z.ZodNumber>;
} & {
    shape: z.ZodLiteral<"capsule">;
    radius: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    height?: number;
    radius?: number;
    shape?: "capsule";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}, {
    height?: number;
    radius?: number;
    shape?: "capsule";
    friction?: number;
    restitution?: number;
    isSensor?: boolean;
    categoryBits?: number;
    maskBits?: number;
}>]>;
export declare const CharacterComponentSchema: z.ZodObject<{
    upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
    snapToGround: z.ZodOptional<z.ZodNumber>;
    maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
    minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
    autoStep: z.ZodOptional<z.ZodBoolean>;
    maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
    slideOnSlope: z.ZodOptional<z.ZodBoolean>;
    collisionOffset: z.ZodOptional<z.ZodNumber>;
    isGrounded: z.ZodOptional<z.ZodBoolean>;
    floorNormal: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    floorAngle: z.ZodOptional<z.ZodNumber>;
    platformVelocity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    hitCeiling: z.ZodOptional<z.ZodBoolean>;
    hitWall: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    upDirection?: "up" | "down";
    snapToGround?: number;
    maxSlopeAngle?: number;
    minSlopeSlideAngle?: number;
    autoStep?: boolean;
    maxAutoStepHeight?: number;
    slideOnSlope?: boolean;
    collisionOffset?: number;
    isGrounded?: boolean;
    floorNormal?: {
        x?: number;
        y?: number;
    };
    floorAngle?: number;
    platformVelocity?: {
        x?: number;
        y?: number;
    };
    hitCeiling?: boolean;
    hitWall?: boolean;
}, {
    upDirection?: "up" | "down";
    snapToGround?: number;
    maxSlopeAngle?: number;
    minSlopeSlideAngle?: number;
    autoStep?: boolean;
    maxAutoStepHeight?: number;
    slideOnSlope?: boolean;
    collisionOffset?: number;
    isGrounded?: boolean;
    floorNormal?: {
        x?: number;
        y?: number;
    };
    floorAngle?: number;
    platformVelocity?: {
        x?: number;
        y?: number;
    };
    hitCeiling?: boolean;
    hitWall?: boolean;
}>;
export declare const TransformComponentSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    angle: z.ZodDefault<z.ZodNumber>;
    scaleX: z.ZodDefault<z.ZodNumber>;
    scaleY: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
}, {
    x?: number;
    y?: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
}>;
export declare const SlotDefinitionSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    layer: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
    layer?: number;
}, {
    x?: number;
    y?: number;
    layer?: number;
}>;
export declare const ChildEntityDefinitionSchema: z.ZodType<any>;
export declare const ChildPrefabDefinitionSchema: z.ZodType<any>;
export declare const BodyEntityPrefabSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"body">>;
    id: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    whatDescription: z.ZodOptional<z.ZodString>;
    scriptRef: z.ZodOptional<z.ZodString>;
    visual: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"rect">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"circle">;
        radius: z.ZodOptional<z.ZodNumber>;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }>, z.ZodObject<{
        color: z.ZodOptional<z.ZodString>;
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"image">;
        whatDescription: z.ZodOptional<z.ZodString>;
        tint: z.ZodOptional<z.ZodString>;
        imageWidth: z.ZodOptional<z.ZodNumber>;
        imageHeight: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
        scale: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodString>;
        align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }>]>>;
    physics: z.ZodOptional<z.ZodObject<{
        bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
        density: z.ZodOptional<z.ZodNumber>;
        mass: z.ZodOptional<z.ZodNumber>;
        gravityScale: z.ZodOptional<z.ZodNumber>;
        linearDamping: z.ZodOptional<z.ZodNumber>;
        angularDamping: z.ZodOptional<z.ZodNumber>;
        fixedRotation: z.ZodOptional<z.ZodBoolean>;
        ccd: z.ZodOptional<z.ZodBoolean>;
        initialVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }>>;
    collider: z.ZodOptional<z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"box">;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"circle">;
        radius: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"capsule">;
        radius: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>]>>;
    character: z.ZodOptional<z.ZodObject<{
        upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
        snapToGround: z.ZodOptional<z.ZodNumber>;
        maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
        minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
        autoStep: z.ZodOptional<z.ZodBoolean>;
        maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
        slideOnSlope: z.ZodOptional<z.ZodBoolean>;
        collisionOffset: z.ZodOptional<z.ZodNumber>;
        isGrounded: z.ZodOptional<z.ZodBoolean>;
        floorNormal: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        floorAngle: z.ZodOptional<z.ZodNumber>;
        platformVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        hitCeiling: z.ZodOptional<z.ZodBoolean>;
        hitWall: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    layer: z.ZodOptional<z.ZodNumber>;
    slots: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        layer: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
        layer?: number;
    }, {
        x?: number;
        y?: number;
        layer?: number;
    }>>>;
    children: z.ZodOptional<z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    children?: any[];
    type?: "body";
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    description?: string;
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    whatDescription?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    slots?: Record<string, {
        x?: number;
        y?: number;
        layer?: number;
    }>;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
}, {
    id?: string;
    children?: any[];
    type?: "body";
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    description?: string;
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    whatDescription?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    slots?: Record<string, {
        x?: number;
        y?: number;
        layer?: number;
    }>;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
}>;
export declare const EntityPrefabSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"body">>;
    id: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    whatDescription: z.ZodOptional<z.ZodString>;
    scriptRef: z.ZodOptional<z.ZodString>;
    visual: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"rect">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"circle">;
        radius: z.ZodOptional<z.ZodNumber>;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }>, z.ZodObject<{
        color: z.ZodOptional<z.ZodString>;
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"image">;
        whatDescription: z.ZodOptional<z.ZodString>;
        tint: z.ZodOptional<z.ZodString>;
        imageWidth: z.ZodOptional<z.ZodNumber>;
        imageHeight: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
        scale: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodString>;
        align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }>]>>;
    physics: z.ZodOptional<z.ZodObject<{
        bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
        density: z.ZodOptional<z.ZodNumber>;
        mass: z.ZodOptional<z.ZodNumber>;
        gravityScale: z.ZodOptional<z.ZodNumber>;
        linearDamping: z.ZodOptional<z.ZodNumber>;
        angularDamping: z.ZodOptional<z.ZodNumber>;
        fixedRotation: z.ZodOptional<z.ZodBoolean>;
        ccd: z.ZodOptional<z.ZodBoolean>;
        initialVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }>>;
    collider: z.ZodOptional<z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"box">;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"circle">;
        radius: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"capsule">;
        radius: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>]>>;
    character: z.ZodOptional<z.ZodObject<{
        upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
        snapToGround: z.ZodOptional<z.ZodNumber>;
        maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
        minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
        autoStep: z.ZodOptional<z.ZodBoolean>;
        maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
        slideOnSlope: z.ZodOptional<z.ZodBoolean>;
        collisionOffset: z.ZodOptional<z.ZodNumber>;
        isGrounded: z.ZodOptional<z.ZodBoolean>;
        floorNormal: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        floorAngle: z.ZodOptional<z.ZodNumber>;
        platformVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        hitCeiling: z.ZodOptional<z.ZodBoolean>;
        hitWall: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    layer: z.ZodOptional<z.ZodNumber>;
    slots: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        layer: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
        layer?: number;
    }, {
        x?: number;
        y?: number;
        layer?: number;
    }>>>;
    children: z.ZodOptional<z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    children?: any[];
    type?: "body";
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    description?: string;
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    whatDescription?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    slots?: Record<string, {
        x?: number;
        y?: number;
        layer?: number;
    }>;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
}, {
    id?: string;
    children?: any[];
    type?: "body";
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    description?: string;
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    whatDescription?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    slots?: Record<string, {
        x?: number;
        y?: number;
        layer?: number;
    }>;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
}>;
export declare const GameEntitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodDefault<z.ZodString>;
    prefab: z.ZodOptional<z.ZodString>;
    scriptRef: z.ZodOptional<z.ZodString>;
    transform: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        angle: z.ZodDefault<z.ZodNumber>;
        scaleX: z.ZodDefault<z.ZodNumber>;
        scaleY: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
        angle?: number;
        scaleX?: number;
        scaleY?: number;
    }, {
        x?: number;
        y?: number;
        angle?: number;
        scaleX?: number;
        scaleY?: number;
    }>;
    visual: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"rect">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"circle">;
        radius: z.ZodOptional<z.ZodNumber>;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }, {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    }>, z.ZodObject<{
        color: z.ZodOptional<z.ZodString>;
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"image">;
        whatDescription: z.ZodOptional<z.ZodString>;
        tint: z.ZodOptional<z.ZodString>;
        imageWidth: z.ZodOptional<z.ZodNumber>;
        imageHeight: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
        scale: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }, {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    }>, z.ZodObject<{
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        opacity: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
        shadow: z.ZodOptional<z.ZodObject<{
            color: z.ZodString;
            offsetX: z.ZodNumber;
            offsetY: z.ZodNumber;
            blur: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }, {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        }>>;
    } & {
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodString>;
        align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }, {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    }>]>>;
    physics: z.ZodOptional<z.ZodObject<{
        bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
        density: z.ZodOptional<z.ZodNumber>;
        mass: z.ZodOptional<z.ZodNumber>;
        gravityScale: z.ZodOptional<z.ZodNumber>;
        linearDamping: z.ZodOptional<z.ZodNumber>;
        angularDamping: z.ZodOptional<z.ZodNumber>;
        fixedRotation: z.ZodOptional<z.ZodBoolean>;
        ccd: z.ZodOptional<z.ZodBoolean>;
        initialVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }, {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    }>>;
    collider: z.ZodOptional<z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"box">;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"circle">;
        radius: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"polygon">;
        vertices: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>, z.ZodObject<{
        friction: z.ZodOptional<z.ZodNumber>;
        restitution: z.ZodOptional<z.ZodNumber>;
        isSensor: z.ZodOptional<z.ZodBoolean>;
        categoryBits: z.ZodOptional<z.ZodNumber>;
        maskBits: z.ZodOptional<z.ZodNumber>;
    } & {
        shape: z.ZodLiteral<"capsule">;
        radius: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }, {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    }>]>>;
    character: z.ZodOptional<z.ZodObject<{
        upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
        snapToGround: z.ZodOptional<z.ZodNumber>;
        maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
        minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
        autoStep: z.ZodOptional<z.ZodBoolean>;
        maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
        slideOnSlope: z.ZodOptional<z.ZodBoolean>;
        collisionOffset: z.ZodOptional<z.ZodNumber>;
        isGrounded: z.ZodOptional<z.ZodBoolean>;
        floorNormal: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        floorAngle: z.ZodOptional<z.ZodNumber>;
        platformVelocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        hitCeiling: z.ZodOptional<z.ZodBoolean>;
        hitWall: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }, {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    layer: z.ZodOptional<z.ZodNumber>;
    visible: z.ZodOptional<z.ZodBoolean>;
    active: z.ZodOptional<z.ZodBoolean>;
    children: z.ZodOptional<z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    children?: any[];
    transform?: {
        x?: number;
        y?: number;
        angle?: number;
        scaleX?: number;
        scaleY?: number;
    };
    name?: string;
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    visible?: boolean;
    prefab?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
    active?: boolean;
}, {
    id?: string;
    children?: any[];
    transform?: {
        x?: number;
        y?: number;
        angle?: number;
        scaleX?: number;
        scaleY?: number;
    };
    name?: string;
    physics?: {
        bodyType?: "kinematic" | "static" | "dynamic";
        mass?: number;
        density?: number;
        gravityScale?: number;
        linearDamping?: number;
        angularDamping?: number;
        fixedRotation?: boolean;
        ccd?: boolean;
        initialVelocity?: {
            x?: number;
            y?: number;
        };
        initialAngularVelocity?: number;
    };
    visual?: {
        color?: string;
        type?: "rect";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "circle";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        radius?: number;
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
    } | {
        color?: string;
        type?: "polygon";
        height?: number;
        width?: number;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        vertices?: {
            x?: number;
            y?: number;
        }[];
    } | {
        color?: string;
        type?: "image";
        height?: number;
        width?: number;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        assetId?: string;
        blendMode?: "sub" | "mix" | "add" | "mul";
        tint?: string;
        opacity?: number;
        whatDescription?: string;
        url?: string;
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        strokeColor?: string;
        imageWidth?: number;
        imageHeight?: number;
    } | {
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        text?: string;
        offsetX?: number;
        offsetY?: number;
        blendMode?: "sub" | "mix" | "add" | "mul";
        opacity?: number;
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        strokeWidth?: number;
        fontSize?: number;
        fontFamily?: string;
        strokeColor?: string;
    };
    visible?: boolean;
    prefab?: string;
    character?: {
        upDirection?: "up" | "down";
        snapToGround?: number;
        maxSlopeAngle?: number;
        minSlopeSlideAngle?: number;
        autoStep?: boolean;
        maxAutoStepHeight?: number;
        slideOnSlope?: boolean;
        collisionOffset?: number;
        isGrounded?: boolean;
        floorNormal?: {
            x?: number;
            y?: number;
        };
        floorAngle?: number;
        platformVelocity?: {
            x?: number;
            y?: number;
        };
        hitCeiling?: boolean;
        hitWall?: boolean;
    };
    layer?: number;
    collider?: {
        height?: number;
        width?: number;
        shape?: "box";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        radius?: number;
        shape?: "circle";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        shape?: "polygon";
        vertices?: {
            x?: number;
            y?: number;
        }[];
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    } | {
        height?: number;
        radius?: number;
        shape?: "capsule";
        friction?: number;
        restitution?: number;
        isSensor?: boolean;
        categoryBits?: number;
        maskBits?: number;
    };
    tags?: string[];
    scriptRef?: string;
    active?: boolean;
}>;
export declare const WorldConfigSchema: z.ZodObject<{
    gravity: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    pixelsPerMeter: z.ZodDefault<z.ZodNumber>;
    bounds: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
    }, {
        height?: number;
        width?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    gravity?: {
        x?: number;
        y?: number;
    };
    pixelsPerMeter?: number;
    bounds?: {
        height?: number;
        width?: number;
    };
}, {
    gravity?: {
        x?: number;
        y?: number;
    };
    pixelsPerMeter?: number;
    bounds?: {
        height?: number;
        width?: number;
    };
}>;
export declare const CameraConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["fixed", "follow", "follow-x", "follow-y", "auto-scroll"]>;
    followTarget: z.ZodOptional<z.ZodString>;
    viewHeight: z.ZodOptional<z.ZodNumber>;
    zoom: z.ZodOptional<z.ZodNumber>;
    minZoom: z.ZodOptional<z.ZodNumber>;
    maxZoom: z.ZodOptional<z.ZodNumber>;
    followSmoothing: z.ZodOptional<z.ZodNumber>;
    followOffset: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    deadZone: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
    }, {
        height?: number;
        width?: number;
    }>>;
    lookAhead: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        distance: z.ZodNumber;
        smoothing: z.ZodOptional<z.ZodNumber>;
        mode: z.ZodOptional<z.ZodEnum<["velocity", "facing", "input"]>>;
    }, "strip", z.ZodTypeAny, {
        distance?: number;
        enabled?: boolean;
        mode?: "velocity" | "facing" | "input";
        smoothing?: number;
    }, {
        distance?: number;
        enabled?: boolean;
        mode?: "velocity" | "facing" | "input";
        smoothing?: number;
    }>>;
    bounds: z.ZodOptional<z.ZodObject<{
        minX: z.ZodNumber;
        maxX: z.ZodNumber;
        minY: z.ZodNumber;
        maxY: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
    }, {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
    }>>;
    autoScroll: z.ZodOptional<z.ZodObject<{
        direction: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        speed: z.ZodNumber;
        acceleration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        direction?: {
            x?: number;
            y?: number;
        };
        speed?: number;
        acceleration?: number;
    }, {
        direction?: {
            x?: number;
            y?: number;
        };
        speed?: number;
        acceleration?: number;
    }>>;
    shake: z.ZodOptional<z.ZodObject<{
        decay: z.ZodOptional<z.ZodNumber>;
        maxOffset: z.ZodOptional<z.ZodNumber>;
        maxRotation: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        decay?: number;
        maxOffset?: number;
        maxRotation?: number;
    }, {
        decay?: number;
        maxOffset?: number;
        maxRotation?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
    zoom?: number;
    bounds?: {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
    };
    followTarget?: string;
    viewHeight?: number;
    minZoom?: number;
    maxZoom?: number;
    followSmoothing?: number;
    followOffset?: {
        x?: number;
        y?: number;
    };
    deadZone?: {
        height?: number;
        width?: number;
    };
    lookAhead?: {
        distance?: number;
        enabled?: boolean;
        mode?: "velocity" | "facing" | "input";
        smoothing?: number;
    };
    autoScroll?: {
        direction?: {
            x?: number;
            y?: number;
        };
        speed?: number;
        acceleration?: number;
    };
    shake?: {
        decay?: number;
        maxOffset?: number;
        maxRotation?: number;
    };
}, {
    type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
    zoom?: number;
    bounds?: {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
    };
    followTarget?: string;
    viewHeight?: number;
    minZoom?: number;
    maxZoom?: number;
    followSmoothing?: number;
    followOffset?: {
        x?: number;
        y?: number;
    };
    deadZone?: {
        height?: number;
        width?: number;
    };
    lookAhead?: {
        distance?: number;
        enabled?: boolean;
        mode?: "velocity" | "facing" | "input";
        smoothing?: number;
    };
    autoScroll?: {
        direction?: {
            x?: number;
            y?: number;
        };
        speed?: number;
        acceleration?: number;
    };
    shake?: {
        decay?: number;
        maxOffset?: number;
        maxRotation?: number;
    };
}>;
export declare const PresentationConfigSchema: z.ZodObject<{
    aspectRatio: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height?: number;
        width?: number;
    }, {
        height?: number;
        width?: number;
    }>, z.ZodNumber]>>;
    fit: z.ZodOptional<z.ZodEnum<["contain", "cover"]>>;
    letterboxColor: z.ZodOptional<z.ZodString>;
    orientation: z.ZodOptional<z.ZodEnum<["portrait", "landscape", "any"]>>;
}, "strip", z.ZodTypeAny, {
    fit?: "contain" | "cover";
    aspectRatio?: number | {
        height?: number;
        width?: number;
    };
    letterboxColor?: string;
    orientation?: "portrait" | "landscape" | "any";
}, {
    fit?: "contain" | "cover";
    aspectRatio?: number | {
        height?: number;
        width?: number;
    };
    letterboxColor?: string;
    orientation?: "portrait" | "landscape" | "any";
}>;
export declare const GameMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    title: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    updatedAt: z.ZodOptional<z.ZodNumber>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    thumbnailAssetRef: z.ZodOptional<z.ZodString>;
    titleHeroImageUrl: z.ZodOptional<z.ZodString>;
    titleHeroAssetRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    createdAt?: number;
    updatedAt?: number;
    version?: string;
    author?: string;
    slug?: string;
    instructions?: string;
    thumbnailAssetRef?: string;
    titleHeroImageUrl?: string;
    titleHeroAssetRef?: string;
}, {
    id?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    createdAt?: number;
    updatedAt?: number;
    version?: string;
    author?: string;
    slug?: string;
    instructions?: string;
    thumbnailAssetRef?: string;
    titleHeroImageUrl?: string;
    titleHeroAssetRef?: string;
}>;
export declare const AssetConfigSchema: z.ZodObject<{
    imageUrl: z.ZodOptional<z.ZodString>;
    assetRef: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    scale: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    animations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        frames: z.ZodArray<z.ZodString, "many">;
        fps: z.ZodNumber;
        loop: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }, {
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>>>;
}, "strip", z.ZodTypeAny, {
    source?: "none" | "generated" | "uploaded";
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetRef?: string;
    imageUrl?: string;
    animations?: Record<string, {
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>;
}, {
    source?: "none" | "generated" | "uploaded";
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    assetRef?: string;
    imageUrl?: string;
    animations?: Record<string, {
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>;
}>;
export declare const ParallaxDepthSchema: z.ZodEnum<["sky", "far", "mid", "near"]>;
export declare const ParallaxLayerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
    assetRef: z.ZodOptional<z.ZodString>;
    depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
    parallaxFactor: z.ZodNumber;
    scale: z.ZodOptional<z.ZodNumber>;
    offsetX: z.ZodOptional<z.ZodNumber>;
    offsetY: z.ZodOptional<z.ZodNumber>;
    visible: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    depth?: "sky" | "far" | "mid" | "near";
    parallaxFactor?: number;
    visible?: boolean;
    assetRef?: string;
    imageUrl?: string;
}, {
    id?: string;
    name?: string;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    depth?: "sky" | "far" | "mid" | "near";
    parallaxFactor?: number;
    visible?: boolean;
    assetRef?: string;
    imageUrl?: string;
}>;
export declare const ParallaxConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    layers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
        assetRef: z.ZodOptional<z.ZodString>;
        depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
        parallaxFactor: z.ZodNumber;
        scale: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}, {
    enabled?: boolean;
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}>;
export declare const TileLayerTypeSchema: z.ZodEnum<["background", "collision", "foreground", "decoration"]>;
export declare const TileLayerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["background", "collision", "foreground", "decoration"]>;
    visible: z.ZodBoolean;
    opacity: z.ZodNumber;
    data: z.ZodArray<z.ZodNumber, "many">;
    parallaxFactor: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "collision" | "background" | "foreground" | "decoration";
    name?: string;
    opacity?: number;
    parallaxFactor?: number;
    visible?: boolean;
    zIndex?: number;
    data?: number[];
}, {
    id?: string;
    type?: "collision" | "background" | "foreground" | "decoration";
    name?: string;
    opacity?: number;
    parallaxFactor?: number;
    visible?: boolean;
    zIndex?: number;
    data?: number[];
}>;
export declare const TileMapSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    tileSheetId: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    layers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["background", "collision", "foreground", "decoration"]>;
        visible: z.ZodBoolean;
        opacity: z.ZodNumber;
        data: z.ZodArray<z.ZodNumber, "many">;
        parallaxFactor: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "collision" | "background" | "foreground" | "decoration";
        name?: string;
        opacity?: number;
        parallaxFactor?: number;
        visible?: boolean;
        zIndex?: number;
        data?: number[];
    }, {
        id?: string;
        type?: "collision" | "background" | "foreground" | "decoration";
        name?: string;
        opacity?: number;
        parallaxFactor?: number;
        visible?: boolean;
        zIndex?: number;
        data?: number[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id?: string;
    height?: number;
    width?: number;
    name?: string;
    layers?: {
        id?: string;
        type?: "collision" | "background" | "foreground" | "decoration";
        name?: string;
        opacity?: number;
        parallaxFactor?: number;
        visible?: boolean;
        zIndex?: number;
        data?: number[];
    }[];
    tileSheetId?: string;
}, {
    id?: string;
    height?: number;
    width?: number;
    name?: string;
    layers?: {
        id?: string;
        type?: "collision" | "background" | "foreground" | "decoration";
        name?: string;
        opacity?: number;
        parallaxFactor?: number;
        visible?: boolean;
        zIndex?: number;
        data?: number[];
    }[];
    tileSheetId?: string;
}>;
export declare const GameRevoluteJointSchema: z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"revolute">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    enableLimit: z.ZodOptional<z.ZodBoolean>;
    lowerAngle: z.ZodOptional<z.ZodNumber>;
    upperAngle: z.ZodOptional<z.ZodNumber>;
    enableMotor: z.ZodOptional<z.ZodBoolean>;
    motorSpeed: z.ZodOptional<z.ZodNumber>;
    maxMotorTorque: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "revolute";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    lowerAngle?: number;
    upperAngle?: number;
    enableMotor?: boolean;
    motorSpeed?: number;
    maxMotorTorque?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "revolute";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    lowerAngle?: number;
    upperAngle?: number;
    enableMotor?: boolean;
    motorSpeed?: number;
    maxMotorTorque?: number;
}>;
export declare const GameDistanceJointSchema: z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"distance">;
    anchorA: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    anchorB: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    length: z.ZodOptional<z.ZodNumber>;
    stiffness: z.ZodOptional<z.ZodNumber>;
    damping: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    length?: number;
    type?: "distance";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    anchorA?: {
        x?: number;
        y?: number;
    };
    anchorB?: {
        x?: number;
        y?: number;
    };
    stiffness?: number;
    damping?: number;
}, {
    id?: string;
    length?: number;
    type?: "distance";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    anchorA?: {
        x?: number;
        y?: number;
    };
    anchorB?: {
        x?: number;
        y?: number;
    };
    stiffness?: number;
    damping?: number;
}>;
export declare const GameWeldJointSchema: z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"weld">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    stiffness: z.ZodOptional<z.ZodNumber>;
    damping: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "weld";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    stiffness?: number;
    damping?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "weld";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    stiffness?: number;
    damping?: number;
}>;
export declare const GamePrismaticJointSchema: z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"prismatic">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    axis: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    enableLimit: z.ZodOptional<z.ZodBoolean>;
    lowerTranslation: z.ZodOptional<z.ZodNumber>;
    upperTranslation: z.ZodOptional<z.ZodNumber>;
    enableMotor: z.ZodOptional<z.ZodBoolean>;
    motorSpeed: z.ZodOptional<z.ZodNumber>;
    maxMotorForce: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "prismatic";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    enableMotor?: boolean;
    motorSpeed?: number;
    axis?: {
        x?: number;
        y?: number;
    };
    lowerTranslation?: number;
    upperTranslation?: number;
    maxMotorForce?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "prismatic";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    enableMotor?: boolean;
    motorSpeed?: number;
    axis?: {
        x?: number;
        y?: number;
    };
    lowerTranslation?: number;
    upperTranslation?: number;
    maxMotorForce?: number;
}>;
export declare const GameJointSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"revolute">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    enableLimit: z.ZodOptional<z.ZodBoolean>;
    lowerAngle: z.ZodOptional<z.ZodNumber>;
    upperAngle: z.ZodOptional<z.ZodNumber>;
    enableMotor: z.ZodOptional<z.ZodBoolean>;
    motorSpeed: z.ZodOptional<z.ZodNumber>;
    maxMotorTorque: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "revolute";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    lowerAngle?: number;
    upperAngle?: number;
    enableMotor?: boolean;
    motorSpeed?: number;
    maxMotorTorque?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "revolute";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    lowerAngle?: number;
    upperAngle?: number;
    enableMotor?: boolean;
    motorSpeed?: number;
    maxMotorTorque?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"distance">;
    anchorA: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    anchorB: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    length: z.ZodOptional<z.ZodNumber>;
    stiffness: z.ZodOptional<z.ZodNumber>;
    damping: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    length?: number;
    type?: "distance";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    anchorA?: {
        x?: number;
        y?: number;
    };
    anchorB?: {
        x?: number;
        y?: number;
    };
    stiffness?: number;
    damping?: number;
}, {
    id?: string;
    length?: number;
    type?: "distance";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    anchorA?: {
        x?: number;
        y?: number;
    };
    anchorB?: {
        x?: number;
        y?: number;
    };
    stiffness?: number;
    damping?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"weld">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    stiffness: z.ZodOptional<z.ZodNumber>;
    damping: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "weld";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    stiffness?: number;
    damping?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "weld";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    stiffness?: number;
    damping?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    entityA: z.ZodString;
    entityB: z.ZodString;
    collideConnected: z.ZodOptional<z.ZodBoolean>;
} & {
    type: z.ZodLiteral<"prismatic">;
    anchor: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    axis: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    enableLimit: z.ZodOptional<z.ZodBoolean>;
    lowerTranslation: z.ZodOptional<z.ZodNumber>;
    upperTranslation: z.ZodOptional<z.ZodNumber>;
    enableMotor: z.ZodOptional<z.ZodBoolean>;
    motorSpeed: z.ZodOptional<z.ZodNumber>;
    maxMotorForce: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "prismatic";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    enableMotor?: boolean;
    motorSpeed?: number;
    axis?: {
        x?: number;
        y?: number;
    };
    lowerTranslation?: number;
    upperTranslation?: number;
    maxMotorForce?: number;
}, {
    id?: string;
    anchor?: {
        x?: number;
        y?: number;
    };
    type?: "prismatic";
    entityA?: string;
    entityB?: string;
    collideConnected?: boolean;
    enableLimit?: boolean;
    enableMotor?: boolean;
    motorSpeed?: number;
    axis?: {
        x?: number;
        y?: number;
    };
    lowerTranslation?: number;
    upperTranslation?: number;
    maxMotorForce?: number;
}>]>;
export declare const SheetLayoutSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"grid">;
    columns: z.ZodNumber;
    rows: z.ZodNumber;
    cellWidth: z.ZodNumber;
    cellHeight: z.ZodNumber;
    spacing: z.ZodOptional<z.ZodNumber>;
    margin: z.ZodOptional<z.ZodNumber>;
    origin: z.ZodOptional<z.ZodLiteral<"top-left">>;
}, "strip", z.ZodTypeAny, {
    type?: "grid";
    spacing?: number;
    rows?: number;
    columns?: number;
    cellWidth?: number;
    cellHeight?: number;
    margin?: number;
    origin?: "top-left";
}, {
    type?: "grid";
    spacing?: number;
    rows?: number;
    columns?: number;
    cellWidth?: number;
    cellHeight?: number;
    margin?: number;
    origin?: "top-left";
}>, z.ZodObject<{
    type: z.ZodLiteral<"strip">;
    direction: z.ZodEnum<["horizontal", "vertical"]>;
    frameCount: z.ZodNumber;
    cellWidth: z.ZodNumber;
    cellHeight: z.ZodNumber;
    spacing: z.ZodOptional<z.ZodNumber>;
    margin: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    direction?: "horizontal" | "vertical";
    type?: "strip";
    spacing?: number;
    cellWidth?: number;
    cellHeight?: number;
    margin?: number;
    frameCount?: number;
}, {
    direction?: "horizontal" | "vertical";
    type?: "strip";
    spacing?: number;
    cellWidth?: number;
    cellHeight?: number;
    margin?: number;
    frameCount?: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"manual">;
}, "strip", z.ZodTypeAny, {
    type?: "manual";
}, {
    type?: "manual";
}>]>;
export declare const SheetRegionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"gridIndex">;
    index: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type?: "gridIndex";
    index?: number;
}, {
    type?: "gridIndex";
    index?: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"rect">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type?: "rect";
    x?: number;
    y?: number;
    w?: number;
    h?: number;
}, {
    type?: "rect";
    x?: number;
    y?: number;
    w?: number;
    h?: number;
}>]>;
export declare const SheetPivotSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>;
export declare const SheetPromptConfigSchema: z.ZodObject<{
    basePrompt: z.ZodString;
    commonModifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    stylePreset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    basePrompt?: string;
    commonModifiers?: string[];
    stylePreset?: string;
}, {
    basePrompt?: string;
    commonModifiers?: string[];
    stylePreset?: string;
}>;
export declare const AssetSheetEntrySchema: z.ZodObject<{
    id: z.ZodString;
    region: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"gridIndex">;
        index: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type?: "gridIndex";
        index?: number;
    }, {
        type?: "gridIndex";
        index?: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"rect">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type?: "rect";
        x?: number;
        y?: number;
        w?: number;
        h?: number;
    }, {
        type?: "rect";
        x?: number;
        y?: number;
        w?: number;
        h?: number;
    }>]>;
    pivot: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    promptOverride: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    tags?: string[];
    region?: {
        type?: "gridIndex";
        index?: number;
    } | {
        type?: "rect";
        x?: number;
        y?: number;
        w?: number;
        h?: number;
    };
    pivot?: {
        x?: number;
        y?: number;
    };
    promptOverride?: string;
}, {
    id?: string;
    tags?: string[];
    region?: {
        type?: "gridIndex";
        index?: number;
    } | {
        type?: "rect";
        x?: number;
        y?: number;
        w?: number;
        h?: number;
    };
    pivot?: {
        x?: number;
        y?: number;
    };
    promptOverride?: string;
}>;
export declare const SheetAnimationSchema: z.ZodObject<{
    id: z.ZodString;
    frames: z.ZodArray<z.ZodString, "many">;
    fps: z.ZodNumber;
    loop: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    frames?: string[];
    fps?: number;
    loop?: boolean;
}, {
    id?: string;
    frames?: string[];
    fps?: number;
    loop?: boolean;
}>;
export declare const SheetTileCollisionSchema: z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"full">, z.ZodLiteral<"platform">, z.ZodObject<{
    polygon: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    polygon?: {
        x?: number;
        y?: number;
    }[];
}, {
    polygon?: {
        x?: number;
        y?: number;
    }[];
}>]>;
export declare const SheetTileAnimationSchema: z.ZodObject<{
    frames: z.ZodArray<z.ZodNumber, "many">;
    fps: z.ZodNumber;
    loop: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frames?: number[];
    fps?: number;
    loop?: boolean;
}, {
    frames?: number[];
    fps?: number;
    loop?: boolean;
}>;
export declare const SheetTileMetadataSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    collision: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"full">, z.ZodLiteral<"platform">, z.ZodObject<{
        polygon: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        polygon?: {
            x?: number;
            y?: number;
        }[];
    }, {
        polygon?: {
            x?: number;
            y?: number;
        }[];
    }>]>>;
    animation: z.ZodOptional<z.ZodObject<{
        frames: z.ZodArray<z.ZodNumber, "many">;
        fps: z.ZodNumber;
        loop: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        frames?: number[];
        fps?: number;
        loop?: boolean;
    }, {
        frames?: number[];
        fps?: number;
        loop?: boolean;
    }>>;
    promptOverride: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    collision?: "none" | "full" | "platform" | {
        polygon?: {
            x?: number;
            y?: number;
        }[];
    };
    tags?: string[];
    promptOverride?: string;
    animation?: {
        frames?: number[];
        fps?: number;
        loop?: boolean;
    };
}, {
    name?: string;
    collision?: "none" | "full" | "platform" | {
        polygon?: {
            x?: number;
            y?: number;
        }[];
    };
    tags?: string[];
    promptOverride?: string;
    animation?: {
        frames?: number[];
        fps?: number;
        loop?: boolean;
    };
}>;
export declare const TileSheetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    imageUrl: z.ZodString;
    tileWidth: z.ZodNumber;
    tileHeight: z.ZodNumber;
    columns: z.ZodNumber;
    rows: z.ZodNumber;
    spacing: z.ZodOptional<z.ZodNumber>;
    margin: z.ZodOptional<z.ZodNumber>;
    tiles: z.ZodOptional<z.ZodRecord<z.ZodNumber, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        collision: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"full">, z.ZodLiteral<"platform">, z.ZodObject<{
            polygon: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        }, {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        }>]>>;
        animation: z.ZodOptional<z.ZodObject<{
            frames: z.ZodArray<z.ZodNumber, "many">;
            fps: z.ZodNumber;
            loop: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        }, {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        }>>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>>>;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    source?: "none" | "generated" | "uploaded";
    spacing?: number;
    rows?: number;
    imageUrl?: string;
    columns?: number;
    margin?: number;
    tileWidth?: number;
    tileHeight?: number;
    tiles?: Record<number, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>;
}, {
    id?: string;
    name?: string;
    source?: "none" | "generated" | "uploaded";
    spacing?: number;
    rows?: number;
    imageUrl?: string;
    columns?: number;
    margin?: number;
    tileWidth?: number;
    tileHeight?: number;
    tiles?: Record<number, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>;
}>;
export declare const VariationVariantSchema: z.ZodObject<{
    entryId: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    weight: z.ZodOptional<z.ZodNumber>;
    promptOverride: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tags?: string[];
    promptOverride?: string;
    entryId?: string;
    weight?: number;
}, {
    tags?: string[];
    promptOverride?: string;
    entryId?: string;
    weight?: number;
}>;
export declare const VariationGroupSchema: z.ZodObject<{
    id: z.ZodString;
    variants: z.ZodRecord<z.ZodString, z.ZodObject<{
        entryId: z.ZodString;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        weight: z.ZodOptional<z.ZodNumber>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tags?: string[];
        promptOverride?: string;
        entryId?: string;
        weight?: number;
    }, {
        tags?: string[];
        promptOverride?: string;
        entryId?: string;
        weight?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    variants?: Record<string, {
        tags?: string[];
        promptOverride?: string;
        entryId?: string;
        weight?: number;
    }>;
}, {
    id?: string;
    variants?: Record<string, {
        tags?: string[];
        promptOverride?: string;
        entryId?: string;
        weight?: number;
    }>;
}>;
export declare const AssetSheetBaseSchema: z.ZodObject<{
    id: z.ZodString;
    packId: z.ZodString;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    imageAssetId: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodString;
    imageWidth: z.ZodNumber;
    imageHeight: z.ZodNumber;
    layout: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"grid">;
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
        origin: z.ZodOptional<z.ZodLiteral<"top-left">>;
    }, "strip", z.ZodTypeAny, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"strip">;
        direction: z.ZodEnum<["horizontal", "vertical"]>;
        frameCount: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"manual">;
    }, "strip", z.ZodTypeAny, {
        type?: "manual";
    }, {
        type?: "manual";
    }>]>;
    entries: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        region: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"gridIndex">;
            index: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "gridIndex";
            index?: number;
        }, {
            type?: "gridIndex";
            index?: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"rect">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }>]>;
        pivot: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>>;
    promptConfig: z.ZodOptional<z.ZodObject<{
        basePrompt: z.ZodString;
        commonModifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        stylePreset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }>>;
    createdAt: z.ZodNumber;
    deletedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
}, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
}>;
export declare const AssetSheetSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    id: z.ZodString;
    packId: z.ZodString;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    imageAssetId: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodString;
    imageWidth: z.ZodNumber;
    imageHeight: z.ZodNumber;
    layout: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"grid">;
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
        origin: z.ZodOptional<z.ZodLiteral<"top-left">>;
    }, "strip", z.ZodTypeAny, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"strip">;
        direction: z.ZodEnum<["horizontal", "vertical"]>;
        frameCount: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"manual">;
    }, "strip", z.ZodTypeAny, {
        type?: "manual";
    }, {
        type?: "manual";
    }>]>;
    entries: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        region: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"gridIndex">;
            index: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "gridIndex";
            index?: number;
        }, {
            type?: "gridIndex";
            index?: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"rect">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }>]>;
        pivot: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>>;
    promptConfig: z.ZodOptional<z.ZodObject<{
        basePrompt: z.ZodString;
        commonModifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        stylePreset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }>>;
    createdAt: z.ZodNumber;
    deletedAt: z.ZodOptional<z.ZodNumber>;
} & {
    kind: z.ZodLiteral<"sprite">;
    animations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        frames: z.ZodArray<z.ZodString, "many">;
        fps: z.ZodNumber;
        loop: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }, {
        id?: string;
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>>>;
    defaultAnimationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    animations?: Record<string, {
        id?: string;
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "sprite";
    defaultAnimationId?: string;
}, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    animations?: Record<string, {
        id?: string;
        frames?: string[];
        fps?: number;
        loop?: boolean;
    }>;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "sprite";
    defaultAnimationId?: string;
}>, z.ZodObject<{
    id: z.ZodString;
    packId: z.ZodString;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    imageAssetId: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodString;
    imageWidth: z.ZodNumber;
    imageHeight: z.ZodNumber;
    layout: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"grid">;
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
        origin: z.ZodOptional<z.ZodLiteral<"top-left">>;
    }, "strip", z.ZodTypeAny, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"strip">;
        direction: z.ZodEnum<["horizontal", "vertical"]>;
        frameCount: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"manual">;
    }, "strip", z.ZodTypeAny, {
        type?: "manual";
    }, {
        type?: "manual";
    }>]>;
    entries: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        region: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"gridIndex">;
            index: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "gridIndex";
            index?: number;
        }, {
            type?: "gridIndex";
            index?: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"rect">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }>]>;
        pivot: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>>;
    promptConfig: z.ZodOptional<z.ZodObject<{
        basePrompt: z.ZodString;
        commonModifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        stylePreset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }>>;
    createdAt: z.ZodNumber;
    deletedAt: z.ZodOptional<z.ZodNumber>;
} & {
    kind: z.ZodLiteral<"tile">;
    tileWidth: z.ZodNumber;
    tileHeight: z.ZodNumber;
    tiles: z.ZodOptional<z.ZodRecord<z.ZodNumber, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        collision: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"full">, z.ZodLiteral<"platform">, z.ZodObject<{
            polygon: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        }, {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        }>]>>;
        animation: z.ZodOptional<z.ZodObject<{
            frames: z.ZodArray<z.ZodNumber, "many">;
            fps: z.ZodNumber;
            loop: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        }, {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        }>>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    tileWidth?: number;
    tileHeight?: number;
    tiles?: Record<number, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "tile";
}, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    tileWidth?: number;
    tileHeight?: number;
    tiles?: Record<number, {
        name?: string;
        collision?: "none" | "full" | "platform" | {
            polygon?: {
                x?: number;
                y?: number;
            }[];
        };
        tags?: string[];
        promptOverride?: string;
        animation?: {
            frames?: number[];
            fps?: number;
            loop?: boolean;
        };
    }>;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "tile";
}>, z.ZodObject<{
    id: z.ZodString;
    packId: z.ZodString;
    source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    imageAssetId: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodString;
    imageWidth: z.ZodNumber;
    imageHeight: z.ZodNumber;
    layout: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"grid">;
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
        origin: z.ZodOptional<z.ZodLiteral<"top-left">>;
    }, "strip", z.ZodTypeAny, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }, {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"strip">;
        direction: z.ZodEnum<["horizontal", "vertical"]>;
        frameCount: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }, {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"manual">;
    }, "strip", z.ZodTypeAny, {
        type?: "manual";
    }, {
        type?: "manual";
    }>]>;
    entries: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        region: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"gridIndex">;
            index: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "gridIndex";
            index?: number;
        }, {
            type?: "gridIndex";
            index?: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"rect">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }, {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        }>]>;
        pivot: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        promptOverride: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>>;
    promptConfig: z.ZodOptional<z.ZodObject<{
        basePrompt: z.ZodString;
        commonModifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        stylePreset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }, {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    }>>;
    createdAt: z.ZodNumber;
    deletedAt: z.ZodOptional<z.ZodNumber>;
} & {
    kind: z.ZodLiteral<"variation">;
    groups: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        variants: z.ZodRecord<z.ZodString, z.ZodObject<{
            entryId: z.ZodString;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            weight: z.ZodOptional<z.ZodNumber>;
            promptOverride: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        variants?: Record<string, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }>;
    }, {
        id?: string;
        variants?: Record<string, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }>;
    }>>;
    defaultGroupId: z.ZodOptional<z.ZodString>;
    defaultVariantKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    groups?: Record<string, {
        id?: string;
        variants?: Record<string, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }>;
    }>;
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "variation";
    defaultGroupId?: string;
    defaultVariantKey?: string;
}, {
    id?: string;
    entries?: Record<string, {
        id?: string;
        tags?: string[];
        region?: {
            type?: "gridIndex";
            index?: number;
        } | {
            type?: "rect";
            x?: number;
            y?: number;
            w?: number;
            h?: number;
        };
        pivot?: {
            x?: number;
            y?: number;
        };
        promptOverride?: string;
    }>;
    source?: "none" | "generated" | "uploaded";
    createdAt?: number;
    layout?: {
        type?: "grid";
        spacing?: number;
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        origin?: "top-left";
    } | {
        direction?: "horizontal" | "vertical";
        type?: "strip";
        spacing?: number;
        cellWidth?: number;
        cellHeight?: number;
        margin?: number;
        frameCount?: number;
    } | {
        type?: "manual";
    };
    groups?: Record<string, {
        id?: string;
        variants?: Record<string, {
            tags?: string[];
            promptOverride?: string;
            entryId?: string;
            weight?: number;
        }>;
    }>;
    imageUrl?: string;
    packId?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageAssetId?: string;
    promptConfig?: {
        basePrompt?: string;
        commonModifiers?: string[];
        stylePreset?: string;
    };
    deletedAt?: number;
    kind?: "variation";
    defaultGroupId?: string;
    defaultVariantKey?: string;
}>]>;
export declare const TapZoneEdgeSchema: z.ZodEnum<["left", "right", "top", "bottom"]>;
export declare const TapZoneButtonSchema: z.ZodEnum<["left", "right", "up", "down", "jump", "action"]>;
export declare const TapZoneSchema: z.ZodObject<{
    id: z.ZodString;
    edge: z.ZodEnum<["left", "right", "top", "bottom"]>;
    size: z.ZodNumber;
    button: z.ZodEnum<["left", "right", "up", "down", "jump", "action"]>;
    debugColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    button?: "left" | "right" | "up" | "down" | "jump" | "action";
    edge?: "left" | "right" | "bottom" | "top";
    size?: number;
    debugColor?: string;
}, {
    id?: string;
    button?: "left" | "right" | "up" | "down" | "jump" | "action";
    edge?: "left" | "right" | "bottom" | "top";
    size?: number;
    debugColor?: string;
}>;
export declare const VirtualButtonTypeSchema: z.ZodEnum<["jump", "action"]>;
export declare const VirtualButtonSchema: z.ZodObject<{
    id: z.ZodString;
    button: z.ZodEnum<["jump", "action"]>;
    label: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    activeColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    color?: string;
    label?: string;
    button?: "jump" | "action";
    size?: number;
    activeColor?: string;
}, {
    id?: string;
    color?: string;
    label?: string;
    button?: "jump" | "action";
    size?: number;
    activeColor?: string;
}>;
export declare const VirtualJoystickSchema: z.ZodObject<{
    id: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
    knobSize: z.ZodOptional<z.ZodNumber>;
    deadZone: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    knobColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    color?: string;
    deadZone?: number;
    size?: number;
    knobSize?: number;
    knobColor?: string;
}, {
    id?: string;
    color?: string;
    deadZone?: number;
    size?: number;
    knobSize?: number;
    knobColor?: string;
}>;
export declare const DPadDirectionSchema: z.ZodEnum<["up", "down", "left", "right"]>;
export declare const VirtualDPadSchema: z.ZodObject<{
    id: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
    buttonSize: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    activeColor: z.ZodOptional<z.ZodString>;
    showDiagonals: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    color?: string;
    size?: number;
    activeColor?: string;
    buttonSize?: number;
    showDiagonals?: boolean;
}, {
    id?: string;
    color?: string;
    size?: number;
    activeColor?: string;
    buttonSize?: number;
    showDiagonals?: boolean;
}>;
export declare const TiltConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    sensitivity: z.ZodOptional<z.ZodNumber>;
    updateInterval: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    sensitivity?: number;
    updateInterval?: number;
}, {
    enabled?: boolean;
    sensitivity?: number;
    updateInterval?: number;
}>;
export declare const InputConfigSchema: z.ZodObject<{
    tapZones: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        edge: z.ZodEnum<["left", "right", "top", "bottom"]>;
        size: z.ZodNumber;
        button: z.ZodEnum<["left", "right", "up", "down", "jump", "action"]>;
        debugColor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        button?: "left" | "right" | "up" | "down" | "jump" | "action";
        edge?: "left" | "right" | "bottom" | "top";
        size?: number;
        debugColor?: string;
    }, {
        id?: string;
        button?: "left" | "right" | "up" | "down" | "jump" | "action";
        edge?: "left" | "right" | "bottom" | "top";
        size?: number;
        debugColor?: string;
    }>, "many">>;
    debugTapZones: z.ZodOptional<z.ZodBoolean>;
    debugInputs: z.ZodOptional<z.ZodBoolean>;
    virtualButtons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        button: z.ZodEnum<["jump", "action"]>;
        label: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodString>;
        activeColor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        color?: string;
        label?: string;
        button?: "jump" | "action";
        size?: number;
        activeColor?: string;
    }, {
        id?: string;
        color?: string;
        label?: string;
        button?: "jump" | "action";
        size?: number;
        activeColor?: string;
    }>, "many">>;
    virtualJoystick: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        size: z.ZodOptional<z.ZodNumber>;
        knobSize: z.ZodOptional<z.ZodNumber>;
        deadZone: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodString>;
        knobColor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        color?: string;
        deadZone?: number;
        size?: number;
        knobSize?: number;
        knobColor?: string;
    }, {
        id?: string;
        color?: string;
        deadZone?: number;
        size?: number;
        knobSize?: number;
        knobColor?: string;
    }>>;
    virtualDPad: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        size: z.ZodOptional<z.ZodNumber>;
        buttonSize: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodString>;
        activeColor: z.ZodOptional<z.ZodString>;
        showDiagonals: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        color?: string;
        size?: number;
        activeColor?: string;
        buttonSize?: number;
        showDiagonals?: boolean;
    }, {
        id?: string;
        color?: string;
        size?: number;
        activeColor?: string;
        buttonSize?: number;
        showDiagonals?: boolean;
    }>>;
    enableHaptics: z.ZodOptional<z.ZodBoolean>;
    tilt: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        sensitivity: z.ZodOptional<z.ZodNumber>;
        updateInterval: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        sensitivity?: number;
        updateInterval?: number;
    }, {
        enabled?: boolean;
        sensitivity?: number;
        updateInterval?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    tapZones?: {
        id?: string;
        button?: "left" | "right" | "up" | "down" | "jump" | "action";
        edge?: "left" | "right" | "bottom" | "top";
        size?: number;
        debugColor?: string;
    }[];
    debugTapZones?: boolean;
    debugInputs?: boolean;
    virtualButtons?: {
        id?: string;
        color?: string;
        label?: string;
        button?: "jump" | "action";
        size?: number;
        activeColor?: string;
    }[];
    virtualJoystick?: {
        id?: string;
        color?: string;
        deadZone?: number;
        size?: number;
        knobSize?: number;
        knobColor?: string;
    };
    virtualDPad?: {
        id?: string;
        color?: string;
        size?: number;
        activeColor?: string;
        buttonSize?: number;
        showDiagonals?: boolean;
    };
    enableHaptics?: boolean;
    tilt?: {
        enabled?: boolean;
        sensitivity?: number;
        updateInterval?: number;
    };
}, {
    tapZones?: {
        id?: string;
        button?: "left" | "right" | "up" | "down" | "jump" | "action";
        edge?: "left" | "right" | "bottom" | "top";
        size?: number;
        debugColor?: string;
    }[];
    debugTapZones?: boolean;
    debugInputs?: boolean;
    virtualButtons?: {
        id?: string;
        color?: string;
        label?: string;
        button?: "jump" | "action";
        size?: number;
        activeColor?: string;
    }[];
    virtualJoystick?: {
        id?: string;
        color?: string;
        deadZone?: number;
        size?: number;
        knobSize?: number;
        knobColor?: string;
    };
    virtualDPad?: {
        id?: string;
        color?: string;
        size?: number;
        activeColor?: string;
        buttonSize?: number;
        showDiagonals?: boolean;
    };
    enableHaptics?: boolean;
    tilt?: {
        enabled?: boolean;
        sensitivity?: number;
        updateInterval?: number;
    };
}>;
export declare const ImageFieldSchema: z.ZodObject<{
    imageUrl: z.ZodOptional<z.ZodString>;
    assetRef: z.ZodOptional<z.ZodString>;
    localPath: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    assetId?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}, {
    assetId?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}>;
export declare const StaticBackgroundSchema: z.ZodObject<{
    imageUrl: z.ZodOptional<z.ZodString>;
    assetRef: z.ZodOptional<z.ZodString>;
    localPath: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"static">;
    color: z.ZodOptional<z.ZodString>;
    whatDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "static";
    assetId?: string;
    whatDescription?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}, {
    color?: string;
    type?: "static";
    assetId?: string;
    whatDescription?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}>;
export declare const ParallaxBackgroundSchema: z.ZodObject<{
    type: z.ZodLiteral<"parallax">;
    layers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
        assetRef: z.ZodOptional<z.ZodString>;
        depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
        parallaxFactor: z.ZodNumber;
        scale: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type?: "parallax";
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}, {
    type?: "parallax";
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}>;
export declare const BackgroundConfigSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    imageUrl: z.ZodOptional<z.ZodString>;
    assetRef: z.ZodOptional<z.ZodString>;
    localPath: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"static">;
    color: z.ZodOptional<z.ZodString>;
    whatDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    color?: string;
    type?: "static";
    assetId?: string;
    whatDescription?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}, {
    color?: string;
    type?: "static";
    assetId?: string;
    whatDescription?: string;
    assetRef?: string;
    imageUrl?: string;
    localPath?: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"parallax">;
    layers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
        assetRef: z.ZodOptional<z.ZodString>;
        depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
        parallaxFactor: z.ZodNumber;
        scale: z.ZodOptional<z.ZodNumber>;
        offsetX: z.ZodOptional<z.ZodNumber>;
        offsetY: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }, {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type?: "parallax";
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}, {
    type?: "parallax";
    layers?: {
        id?: string;
        name?: string;
        scale?: number;
        offsetX?: number;
        offsetY?: number;
        depth?: "sky" | "far" | "mid" | "near";
        parallaxFactor?: number;
        visible?: boolean;
        assetRef?: string;
        imageUrl?: string;
    }[];
}>]>;
export declare const HoverHighlightConfigSchema: z.ZodObject<{
    targetTag: z.ZodString;
    highlightEntityId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetTag?: string;
    highlightEntityId?: string;
}, {
    targetTag?: string;
    highlightEntityId?: string;
}>;
export declare const GameButtonDefinitionSchema: z.ZodObject<{
    label: z.ZodString;
    eventName: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    variant: z.ZodOptional<z.ZodEnum<["primary", "secondary"]>>;
}, "strip", z.ZodTypeAny, {
    label?: string;
    data?: Record<string, unknown>;
    eventName?: string;
    variant?: "primary" | "secondary";
}, {
    label?: string;
    data?: Record<string, unknown>;
    eventName?: string;
    variant?: "primary" | "secondary";
}>;
export declare const GameDialogStatDefinitionSchema: z.ZodObject<{
    label: z.ZodString;
    variable: z.ZodString;
    format: z.ZodOptional<z.ZodString>;
    binding: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label?: string;
    variable?: string;
    format?: string;
    binding?: string;
}, {
    label?: string;
    variable?: string;
    format?: string;
    binding?: string;
}>;
export declare const GameDialogStyleSchema: z.ZodObject<{
    backgroundColor: z.ZodOptional<z.ZodString>;
    titleColor: z.ZodOptional<z.ZodString>;
    titleFontSize: z.ZodOptional<z.ZodNumber>;
    backdropColor: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    borderRadius: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    width?: string | number;
    backgroundColor?: string;
    titleColor?: string;
    titleFontSize?: number;
    backdropColor?: string;
    borderRadius?: number;
}, {
    width?: string | number;
    backgroundColor?: string;
    titleColor?: string;
    titleFontSize?: number;
    backdropColor?: string;
    borderRadius?: number;
}>;
export declare const GameDialogDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    stats: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        variable: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
        binding: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label?: string;
        variable?: string;
        format?: string;
        binding?: string;
    }, {
        label?: string;
        variable?: string;
        format?: string;
        binding?: string;
    }>, "many">>;
    dismissible: z.ZodOptional<z.ZodBoolean>;
    dismissEventName: z.ZodOptional<z.ZodString>;
    buttons: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        eventName: z.ZodString;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        variant: z.ZodOptional<z.ZodEnum<["primary", "secondary"]>>;
    }, "strip", z.ZodTypeAny, {
        label?: string;
        data?: Record<string, unknown>;
        eventName?: string;
        variant?: "primary" | "secondary";
    }, {
        label?: string;
        data?: Record<string, unknown>;
        eventName?: string;
        variant?: "primary" | "secondary";
    }>, "many">;
    showOnState: z.ZodOptional<z.ZodEnum<["ready", "won", "lost", "paused"]>>;
    showWhen: z.ZodOptional<z.ZodString>;
    style: z.ZodOptional<z.ZodObject<{
        backgroundColor: z.ZodOptional<z.ZodString>;
        titleColor: z.ZodOptional<z.ZodString>;
        titleFontSize: z.ZodOptional<z.ZodNumber>;
        backdropColor: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        borderRadius: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        width?: string | number;
        backgroundColor?: string;
        titleColor?: string;
        titleFontSize?: number;
        backdropColor?: string;
        borderRadius?: number;
    }, {
        width?: string | number;
        backgroundColor?: string;
        titleColor?: string;
        titleFontSize?: number;
        backdropColor?: string;
        borderRadius?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    style?: {
        width?: string | number;
        backgroundColor?: string;
        titleColor?: string;
        titleFontSize?: number;
        backdropColor?: string;
        borderRadius?: number;
    };
    title?: string;
    message?: string;
    stats?: {
        label?: string;
        variable?: string;
        format?: string;
        binding?: string;
    }[];
    dismissible?: boolean;
    dismissEventName?: string;
    buttons?: {
        label?: string;
        data?: Record<string, unknown>;
        eventName?: string;
        variant?: "primary" | "secondary";
    }[];
    showOnState?: "ready" | "won" | "lost" | "paused";
    showWhen?: string;
}, {
    id?: string;
    style?: {
        width?: string | number;
        backgroundColor?: string;
        titleColor?: string;
        titleFontSize?: number;
        backdropColor?: string;
        borderRadius?: number;
    };
    title?: string;
    message?: string;
    stats?: {
        label?: string;
        variable?: string;
        format?: string;
        binding?: string;
    }[];
    dismissible?: boolean;
    dismissEventName?: string;
    buttons?: {
        label?: string;
        data?: Record<string, unknown>;
        eventName?: string;
        variant?: "primary" | "secondary";
    }[];
    showOnState?: "ready" | "won" | "lost" | "paused";
    showWhen?: string;
}>;
export declare const GameDialogsConfigSchema: z.ZodObject<{
    activeDialogVariable: z.ZodOptional<z.ZodString>;
    dialogs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        stats: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            variable: z.ZodString;
            format: z.ZodOptional<z.ZodString>;
            binding: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }, {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }>, "many">>;
        dismissible: z.ZodOptional<z.ZodBoolean>;
        dismissEventName: z.ZodOptional<z.ZodString>;
        buttons: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            eventName: z.ZodString;
            data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            variant: z.ZodOptional<z.ZodEnum<["primary", "secondary"]>>;
        }, "strip", z.ZodTypeAny, {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }, {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }>, "many">;
        showOnState: z.ZodOptional<z.ZodEnum<["ready", "won", "lost", "paused"]>>;
        showWhen: z.ZodOptional<z.ZodString>;
        style: z.ZodOptional<z.ZodObject<{
            backgroundColor: z.ZodOptional<z.ZodString>;
            titleColor: z.ZodOptional<z.ZodString>;
            titleFontSize: z.ZodOptional<z.ZodNumber>;
            backdropColor: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
            borderRadius: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        }, {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        style?: {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        };
        title?: string;
        message?: string;
        stats?: {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }[];
        dismissible?: boolean;
        dismissEventName?: string;
        buttons?: {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }[];
        showOnState?: "ready" | "won" | "lost" | "paused";
        showWhen?: string;
    }, {
        id?: string;
        style?: {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        };
        title?: string;
        message?: string;
        stats?: {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }[];
        dismissible?: boolean;
        dismissEventName?: string;
        buttons?: {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }[];
        showOnState?: "ready" | "won" | "lost" | "paused";
        showWhen?: string;
    }>, "many">;
    legacyWinDialogFallback: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    activeDialogVariable?: string;
    dialogs?: {
        id?: string;
        style?: {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        };
        title?: string;
        message?: string;
        stats?: {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }[];
        dismissible?: boolean;
        dismissEventName?: string;
        buttons?: {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }[];
        showOnState?: "ready" | "won" | "lost" | "paused";
        showWhen?: string;
    }[];
    legacyWinDialogFallback?: boolean;
}, {
    activeDialogVariable?: string;
    dialogs?: {
        id?: string;
        style?: {
            width?: string | number;
            backgroundColor?: string;
            titleColor?: string;
            titleFontSize?: number;
            backdropColor?: string;
            borderRadius?: number;
        };
        title?: string;
        message?: string;
        stats?: {
            label?: string;
            variable?: string;
            format?: string;
            binding?: string;
        }[];
        dismissible?: boolean;
        dismissEventName?: string;
        buttons?: {
            label?: string;
            data?: Record<string, unknown>;
            eventName?: string;
            variant?: "primary" | "secondary";
        }[];
        showOnState?: "ready" | "won" | "lost" | "paused";
        showWhen?: string;
    }[];
    legacyWinDialogFallback?: boolean;
}>;
export declare const MultiplayerConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    maxPlayers: z.ZodNumber;
    syncMode: z.ZodOptional<z.ZodEnum<["host-authoritative", "peer-to-peer"]>>;
    inputDelay: z.ZodOptional<z.ZodNumber>;
    snapshotRate: z.ZodOptional<z.ZodNumber>;
    deltaRate: z.ZodOptional<z.ZodNumber>;
    interpolationDelay: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    maxPlayers?: number;
    syncMode?: "host-authoritative" | "peer-to-peer";
    inputDelay?: number;
    snapshotRate?: number;
    deltaRate?: number;
    interpolationDelay?: number;
}, {
    enabled?: boolean;
    maxPlayers?: number;
    syncMode?: "host-authoritative" | "peer-to-peer";
    inputDelay?: number;
    snapshotRate?: number;
    deltaRate?: number;
    interpolationDelay?: number;
}>;
export declare const LoadingScreenConfigSchema: z.ZodObject<{
    backgroundImageUrl: z.ZodOptional<z.ZodString>;
    backgroundAssetRef: z.ZodOptional<z.ZodString>;
    progressBarImageUrl: z.ZodOptional<z.ZodString>;
    progressBarAssetRef: z.ZodOptional<z.ZodString>;
    progressBarFillImageUrl: z.ZodOptional<z.ZodString>;
    progressBarFillAssetRef: z.ZodOptional<z.ZodString>;
    backgroundColor: z.ZodOptional<z.ZodString>;
    progressBarColor: z.ZodOptional<z.ZodString>;
    textColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundAssetRef?: string;
    progressBarImageUrl?: string;
    progressBarAssetRef?: string;
    progressBarFillImageUrl?: string;
    progressBarFillAssetRef?: string;
    progressBarColor?: string;
    textColor?: string;
}, {
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundAssetRef?: string;
    progressBarImageUrl?: string;
    progressBarAssetRef?: string;
    progressBarFillImageUrl?: string;
    progressBarFillAssetRef?: string;
    progressBarColor?: string;
    textColor?: string;
}>;
export declare const SoundAssetSchema: z.ZodObject<{
    url: z.ZodString;
    assetId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["sfx", "music"]>;
    loop: z.ZodOptional<z.ZodBoolean>;
    defaultVolume: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "sfx" | "music";
    assetId?: string;
    url?: string;
    loop?: boolean;
    defaultVolume?: number;
}, {
    type?: "sfx" | "music";
    assetId?: string;
    url?: string;
    loop?: boolean;
    defaultVolume?: number;
}>;
export declare const VariantSheetConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    groupId: z.ZodString;
    atlasUrl: z.ZodString;
    atlasAssetRef: z.ZodOptional<z.ZodString>;
    metadataUrl: z.ZodOptional<z.ZodString>;
    metadataAssetRef: z.ZodOptional<z.ZodString>;
    layout: z.ZodObject<{
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        cellWidth: z.ZodNumber;
        cellHeight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
    }, {
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    layout?: {
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
    };
    groupId?: string;
    atlasUrl?: string;
    atlasAssetRef?: string;
    metadataUrl?: string;
    metadataAssetRef?: string;
}, {
    enabled?: boolean;
    layout?: {
        rows?: number;
        columns?: number;
        cellWidth?: number;
        cellHeight?: number;
    };
    groupId?: string;
    atlasUrl?: string;
    atlasAssetRef?: string;
    metadataUrl?: string;
    metadataAssetRef?: string;
}>;
export declare const Match3ConfigSchema: z.ZodObject<{
    gridId: z.ZodString;
    rows: z.ZodNumber;
    cols: z.ZodNumber;
    cellSize: z.ZodNumber;
    piecePrefabs: z.ZodArray<z.ZodString, "many">;
    minMatch: z.ZodOptional<z.ZodNumber>;
    swapDuration: z.ZodOptional<z.ZodNumber>;
    fallDuration: z.ZodOptional<z.ZodNumber>;
    clearDelay: z.ZodOptional<z.ZodNumber>;
    variantSheet: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        groupId: z.ZodString;
        atlasUrl: z.ZodString;
        atlasAssetRef: z.ZodOptional<z.ZodString>;
        metadataUrl: z.ZodOptional<z.ZodString>;
        metadataAssetRef: z.ZodOptional<z.ZodString>;
        layout: z.ZodObject<{
            columns: z.ZodNumber;
            rows: z.ZodNumber;
            cellWidth: z.ZodNumber;
            cellHeight: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        }, {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        layout?: {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        };
        groupId?: string;
        atlasUrl?: string;
        atlasAssetRef?: string;
        metadataUrl?: string;
        metadataAssetRef?: string;
    }, {
        enabled?: boolean;
        layout?: {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        };
        groupId?: string;
        atlasUrl?: string;
        atlasAssetRef?: string;
        metadataUrl?: string;
        metadataAssetRef?: string;
    }>>;
    matchDetection: z.ZodOptional<z.ZodString>;
    scoring: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rows?: number;
    cols?: number;
    gridId?: string;
    cellSize?: number;
    piecePrefabs?: string[];
    minMatch?: number;
    swapDuration?: number;
    fallDuration?: number;
    clearDelay?: number;
    variantSheet?: {
        enabled?: boolean;
        layout?: {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        };
        groupId?: string;
        atlasUrl?: string;
        atlasAssetRef?: string;
        metadataUrl?: string;
        metadataAssetRef?: string;
    };
    matchDetection?: string;
    scoring?: string;
}, {
    rows?: number;
    cols?: number;
    gridId?: string;
    cellSize?: number;
    piecePrefabs?: string[];
    minMatch?: number;
    swapDuration?: number;
    fallDuration?: number;
    clearDelay?: number;
    variantSheet?: {
        enabled?: boolean;
        layout?: {
            rows?: number;
            columns?: number;
            cellWidth?: number;
            cellHeight?: number;
        };
        groupId?: string;
        atlasUrl?: string;
        atlasAssetRef?: string;
        metadataUrl?: string;
        metadataAssetRef?: string;
    };
    matchDetection?: string;
    scoring?: string;
}>;
export declare const TetrisConfigSchema: z.ZodObject<{
    gridId: z.ZodString;
    boardWidth: z.ZodNumber;
    boardHeight: z.ZodNumber;
    piecePrefabs: z.ZodArray<z.ZodString, "many">;
    initialDropSpeed: z.ZodOptional<z.ZodNumber>;
    levelSpeedMultiplier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    gridId?: string;
    piecePrefabs?: string[];
    boardWidth?: number;
    boardHeight?: number;
    initialDropSpeed?: number;
    levelSpeedMultiplier?: number;
}, {
    gridId?: string;
    piecePrefabs?: string[];
    boardWidth?: number;
    boardHeight?: number;
    initialDropSpeed?: number;
    levelSpeedMultiplier?: number;
}>;
export declare const OverlayConfigSchema: z.ZodObject<{
    elements: z.ZodArray<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>, "many">;
    theme: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    elements?: z.objectOutputType<{}, z.ZodTypeAny, "passthrough">[];
    theme?: {} & {
        [k: string]: unknown;
    };
}, {
    elements?: z.objectInputType<{}, z.ZodTypeAny, "passthrough">[];
    theme?: {} & {
        [k: string]: unknown;
    };
}>;
export declare const PersistenceConfigSchema: z.ZodObject<{
    storageKey: z.ZodOptional<z.ZodString>;
    schema: z.ZodUnknown;
    defaultProgress: z.ZodUnknown;
    version: z.ZodNumber;
    autoSave: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    autoSave?: {} & {
        [k: string]: unknown;
    };
    storageKey?: string;
    version?: number;
    schema?: unknown;
    defaultProgress?: unknown;
}, {
    autoSave?: {} & {
        [k: string]: unknown;
    };
    storageKey?: string;
    version?: number;
    schema?: unknown;
    defaultProgress?: unknown;
}>;
export declare const ShaderEntrySchema: z.ZodObject<{
    /** Filename for the shader, e.g. "paint.gdshader" */
    filename: z.ZodString;
    /** Godot Shading Language source code */
    glsl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filename?: string;
    glsl?: string;
}, {
    filename?: string;
    glsl?: string;
}>;
export type ShaderEntry = z.infer<typeof ShaderEntrySchema>;
export declare const EffectsConfigSchema: z.ZodObject<{
    /** Effect graph specification — validated separately by the effects compiler */
    graph: z.ZodOptional<z.ZodUnknown>;
    /** Named shader sources that the AI or user can write/edit */
    shaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Filename for the shader, e.g. "paint.gdshader" */
        filename: z.ZodString;
        /** Godot Shading Language source code */
        glsl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        filename?: string;
        glsl?: string;
    }, {
        filename?: string;
        glsl?: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    graph?: unknown;
    shaders?: Record<string, {
        filename?: string;
        glsl?: string;
    }>;
}, {
    graph?: unknown;
    shaders?: Record<string, {
        filename?: string;
        glsl?: string;
    }>;
}>;
export type EffectsConfig = z.infer<typeof EffectsConfigSchema>;
export declare const GameDefinitionSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodOptional<z.ZodString>;
        title: z.ZodDefault<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodNumber>;
        updatedAt: z.ZodOptional<z.ZodNumber>;
        thumbnailUrl: z.ZodOptional<z.ZodString>;
        thumbnailAssetRef: z.ZodOptional<z.ZodString>;
        titleHeroImageUrl: z.ZodOptional<z.ZodString>;
        titleHeroAssetRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        createdAt?: number;
        updatedAt?: number;
        version?: string;
        author?: string;
        slug?: string;
        instructions?: string;
        thumbnailAssetRef?: string;
        titleHeroImageUrl?: string;
        titleHeroAssetRef?: string;
    }, {
        id?: string;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        createdAt?: number;
        updatedAt?: number;
        version?: string;
        author?: string;
        slug?: string;
        instructions?: string;
        thumbnailAssetRef?: string;
        titleHeroImageUrl?: string;
        titleHeroAssetRef?: string;
    }>;
    world: z.ZodObject<{
        gravity: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        pixelsPerMeter: z.ZodDefault<z.ZodNumber>;
        bounds: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            width?: number;
        }, {
            height?: number;
            width?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        gravity?: {
            x?: number;
            y?: number;
        };
        pixelsPerMeter?: number;
        bounds?: {
            height?: number;
            width?: number;
        };
    }, {
        gravity?: {
            x?: number;
            y?: number;
        };
        pixelsPerMeter?: number;
        bounds?: {
            height?: number;
            width?: number;
        };
    }>;
    presentation: z.ZodOptional<z.ZodObject<{
        aspectRatio: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            width?: number;
        }, {
            height?: number;
            width?: number;
        }>, z.ZodNumber]>>;
        fit: z.ZodOptional<z.ZodEnum<["contain", "cover"]>>;
        letterboxColor: z.ZodOptional<z.ZodString>;
        orientation: z.ZodOptional<z.ZodEnum<["portrait", "landscape", "any"]>>;
    }, "strip", z.ZodTypeAny, {
        fit?: "contain" | "cover";
        aspectRatio?: number | {
            height?: number;
            width?: number;
        };
        letterboxColor?: string;
        orientation?: "portrait" | "landscape" | "any";
    }, {
        fit?: "contain" | "cover";
        aspectRatio?: number | {
            height?: number;
            width?: number;
        };
        letterboxColor?: string;
        orientation?: "portrait" | "landscape" | "any";
    }>>;
    camera: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["fixed", "follow", "follow-x", "follow-y", "auto-scroll"]>;
        followTarget: z.ZodOptional<z.ZodString>;
        viewHeight: z.ZodOptional<z.ZodNumber>;
        zoom: z.ZodOptional<z.ZodNumber>;
        minZoom: z.ZodOptional<z.ZodNumber>;
        maxZoom: z.ZodOptional<z.ZodNumber>;
        followSmoothing: z.ZodOptional<z.ZodNumber>;
        followOffset: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        deadZone: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            width?: number;
        }, {
            height?: number;
            width?: number;
        }>>;
        lookAhead: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            distance: z.ZodNumber;
            smoothing: z.ZodOptional<z.ZodNumber>;
            mode: z.ZodOptional<z.ZodEnum<["velocity", "facing", "input"]>>;
        }, "strip", z.ZodTypeAny, {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        }, {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        }>>;
        bounds: z.ZodOptional<z.ZodObject<{
            minX: z.ZodNumber;
            maxX: z.ZodNumber;
            minY: z.ZodNumber;
            maxY: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        }, {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        }>>;
        autoScroll: z.ZodOptional<z.ZodObject<{
            direction: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>;
            speed: z.ZodNumber;
            acceleration: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        }, {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        }>>;
        shake: z.ZodOptional<z.ZodObject<{
            decay: z.ZodOptional<z.ZodNumber>;
            maxOffset: z.ZodOptional<z.ZodNumber>;
            maxRotation: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        }, {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
        zoom?: number;
        bounds?: {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        };
        followTarget?: string;
        viewHeight?: number;
        minZoom?: number;
        maxZoom?: number;
        followSmoothing?: number;
        followOffset?: {
            x?: number;
            y?: number;
        };
        deadZone?: {
            height?: number;
            width?: number;
        };
        lookAhead?: {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        };
        autoScroll?: {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        };
        shake?: {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        };
    }, {
        type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
        zoom?: number;
        bounds?: {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        };
        followTarget?: string;
        viewHeight?: number;
        minZoom?: number;
        maxZoom?: number;
        followSmoothing?: number;
        followOffset?: {
            x?: number;
            y?: number;
        };
        deadZone?: {
            height?: number;
            width?: number;
        };
        lookAhead?: {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        };
        autoScroll?: {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        };
        shake?: {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        };
    }>>;
    background: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        imageUrl: z.ZodOptional<z.ZodString>;
        assetRef: z.ZodOptional<z.ZodString>;
        localPath: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"static">;
        color: z.ZodOptional<z.ZodString>;
        whatDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        type?: "static";
        assetId?: string;
        whatDescription?: string;
        assetRef?: string;
        imageUrl?: string;
        localPath?: string;
    }, {
        color?: string;
        type?: "static";
        assetId?: string;
        whatDescription?: string;
        assetRef?: string;
        imageUrl?: string;
        localPath?: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"parallax">;
        layers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            imageUrl: z.ZodOptional<z.ZodString>;
            assetRef: z.ZodOptional<z.ZodString>;
            depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
            parallaxFactor: z.ZodNumber;
            scale: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            visible: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }, {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type?: "parallax";
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    }, {
        type?: "parallax";
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    }>]>>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString, z.ZodObject<{
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
    }>]>>>;
    prefabs: z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"body">>;
        id: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        whatDescription: z.ZodOptional<z.ZodString>;
        scriptRef: z.ZodOptional<z.ZodString>;
        visual: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"rect">;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"circle">;
            radius: z.ZodOptional<z.ZodNumber>;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"polygon">;
            vertices: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        }, {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        }>, z.ZodObject<{
            color: z.ZodOptional<z.ZodString>;
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"image">;
            whatDescription: z.ZodOptional<z.ZodString>;
            tint: z.ZodOptional<z.ZodString>;
            imageWidth: z.ZodOptional<z.ZodNumber>;
            imageHeight: z.ZodOptional<z.ZodNumber>;
            url: z.ZodOptional<z.ZodString>;
            assetId: z.ZodOptional<z.ZodString>;
            scale: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        }, {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        }>]>>;
        physics: z.ZodOptional<z.ZodObject<{
            bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
            density: z.ZodOptional<z.ZodNumber>;
            mass: z.ZodOptional<z.ZodNumber>;
            gravityScale: z.ZodOptional<z.ZodNumber>;
            linearDamping: z.ZodOptional<z.ZodNumber>;
            angularDamping: z.ZodOptional<z.ZodNumber>;
            fixedRotation: z.ZodOptional<z.ZodBoolean>;
            ccd: z.ZodOptional<z.ZodBoolean>;
            initialVelocity: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        }, {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        }>>;
        collider: z.ZodOptional<z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"box">;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"circle">;
            radius: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"polygon">;
            vertices: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"capsule">;
            radius: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>]>>;
        character: z.ZodOptional<z.ZodObject<{
            upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
            snapToGround: z.ZodOptional<z.ZodNumber>;
            maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
            minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
            autoStep: z.ZodOptional<z.ZodBoolean>;
            maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
            slideOnSlope: z.ZodOptional<z.ZodBoolean>;
            collisionOffset: z.ZodOptional<z.ZodNumber>;
            isGrounded: z.ZodOptional<z.ZodBoolean>;
            floorNormal: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            floorAngle: z.ZodOptional<z.ZodNumber>;
            platformVelocity: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            hitCeiling: z.ZodOptional<z.ZodBoolean>;
            hitWall: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        }, {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        layer: z.ZodOptional<z.ZodNumber>;
        slots: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            layer: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
            layer?: number;
        }, {
            x?: number;
            y?: number;
            layer?: number;
        }>>>;
        children: z.ZodOptional<z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        children?: any[];
        type?: "body";
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        description?: string;
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        whatDescription?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        slots?: Record<string, {
            x?: number;
            y?: number;
            layer?: number;
        }>;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
    }, {
        id?: string;
        children?: any[];
        type?: "body";
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        description?: string;
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        whatDescription?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        slots?: Record<string, {
            x?: number;
            y?: number;
            layer?: number;
        }>;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
    }>>;
    entities: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodDefault<z.ZodString>;
        prefab: z.ZodOptional<z.ZodString>;
        scriptRef: z.ZodOptional<z.ZodString>;
        transform: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            angle: z.ZodDefault<z.ZodNumber>;
            scaleX: z.ZodDefault<z.ZodNumber>;
            scaleY: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        }, {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        }>;
        visual: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"rect">;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"circle">;
            radius: z.ZodOptional<z.ZodNumber>;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"polygon">;
            vertices: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        }, {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        }>, z.ZodObject<{
            color: z.ZodOptional<z.ZodString>;
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"image">;
            whatDescription: z.ZodOptional<z.ZodString>;
            tint: z.ZodOptional<z.ZodString>;
            imageWidth: z.ZodOptional<z.ZodNumber>;
            imageHeight: z.ZodOptional<z.ZodNumber>;
            url: z.ZodOptional<z.ZodString>;
            assetId: z.ZodOptional<z.ZodString>;
            scale: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        }, {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        }>, z.ZodObject<{
            strokeColor: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            blendMode: z.ZodOptional<z.ZodEnum<["mix", "add", "sub", "mul"]>>;
            shadow: z.ZodOptional<z.ZodObject<{
                color: z.ZodString;
                offsetX: z.ZodNumber;
                offsetY: z.ZodNumber;
                blur: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }, {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            }>>;
        } & {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        }, {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        }>]>>;
        physics: z.ZodOptional<z.ZodObject<{
            bodyType: z.ZodEnum<["static", "dynamic", "kinematic"]>;
            density: z.ZodOptional<z.ZodNumber>;
            mass: z.ZodOptional<z.ZodNumber>;
            gravityScale: z.ZodOptional<z.ZodNumber>;
            linearDamping: z.ZodOptional<z.ZodNumber>;
            angularDamping: z.ZodOptional<z.ZodNumber>;
            fixedRotation: z.ZodOptional<z.ZodBoolean>;
            ccd: z.ZodOptional<z.ZodBoolean>;
            initialVelocity: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            initialAngularVelocity: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        }, {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        }>>;
        collider: z.ZodOptional<z.ZodDiscriminatedUnion<"shape", [z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"box">;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"circle">;
            radius: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"polygon">;
            vertices: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>, z.ZodObject<{
            friction: z.ZodOptional<z.ZodNumber>;
            restitution: z.ZodOptional<z.ZodNumber>;
            isSensor: z.ZodOptional<z.ZodBoolean>;
            categoryBits: z.ZodOptional<z.ZodNumber>;
            maskBits: z.ZodOptional<z.ZodNumber>;
        } & {
            shape: z.ZodLiteral<"capsule">;
            radius: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }, {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        }>]>>;
        character: z.ZodOptional<z.ZodObject<{
            upDirection: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
            snapToGround: z.ZodOptional<z.ZodNumber>;
            maxSlopeAngle: z.ZodOptional<z.ZodNumber>;
            minSlopeSlideAngle: z.ZodOptional<z.ZodNumber>;
            autoStep: z.ZodOptional<z.ZodBoolean>;
            maxAutoStepHeight: z.ZodOptional<z.ZodNumber>;
            slideOnSlope: z.ZodOptional<z.ZodBoolean>;
            collisionOffset: z.ZodOptional<z.ZodNumber>;
            isGrounded: z.ZodOptional<z.ZodBoolean>;
            floorNormal: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            floorAngle: z.ZodOptional<z.ZodNumber>;
            platformVelocity: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            hitCeiling: z.ZodOptional<z.ZodBoolean>;
            hitWall: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        }, {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        }>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        layer: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
        active: z.ZodOptional<z.ZodBoolean>;
        children: z.ZodOptional<z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        children?: any[];
        transform?: {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        };
        name?: string;
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        visible?: boolean;
        prefab?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
        active?: boolean;
    }, {
        id?: string;
        children?: any[];
        transform?: {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        };
        name?: string;
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        visible?: boolean;
        prefab?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
        active?: boolean;
    }>, "many">;
    joints: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        id: z.ZodString;
        entityA: z.ZodString;
        entityB: z.ZodString;
        collideConnected: z.ZodOptional<z.ZodBoolean>;
    } & {
        type: z.ZodLiteral<"revolute">;
        anchor: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        enableLimit: z.ZodOptional<z.ZodBoolean>;
        lowerAngle: z.ZodOptional<z.ZodNumber>;
        upperAngle: z.ZodOptional<z.ZodNumber>;
        enableMotor: z.ZodOptional<z.ZodBoolean>;
        motorSpeed: z.ZodOptional<z.ZodNumber>;
        maxMotorTorque: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "revolute";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        lowerAngle?: number;
        upperAngle?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;
    }, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "revolute";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        lowerAngle?: number;
        upperAngle?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        entityA: z.ZodString;
        entityB: z.ZodString;
        collideConnected: z.ZodOptional<z.ZodBoolean>;
    } & {
        type: z.ZodLiteral<"distance">;
        anchorA: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        anchorB: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        length: z.ZodOptional<z.ZodNumber>;
        stiffness: z.ZodOptional<z.ZodNumber>;
        damping: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        length?: number;
        type?: "distance";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        anchorA?: {
            x?: number;
            y?: number;
        };
        anchorB?: {
            x?: number;
            y?: number;
        };
        stiffness?: number;
        damping?: number;
    }, {
        id?: string;
        length?: number;
        type?: "distance";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        anchorA?: {
            x?: number;
            y?: number;
        };
        anchorB?: {
            x?: number;
            y?: number;
        };
        stiffness?: number;
        damping?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        entityA: z.ZodString;
        entityB: z.ZodString;
        collideConnected: z.ZodOptional<z.ZodBoolean>;
    } & {
        type: z.ZodLiteral<"weld">;
        anchor: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        stiffness: z.ZodOptional<z.ZodNumber>;
        damping: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "weld";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        stiffness?: number;
        damping?: number;
    }, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "weld";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        stiffness?: number;
        damping?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        entityA: z.ZodString;
        entityB: z.ZodString;
        collideConnected: z.ZodOptional<z.ZodBoolean>;
    } & {
        type: z.ZodLiteral<"prismatic">;
        anchor: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        axis: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        enableLimit: z.ZodOptional<z.ZodBoolean>;
        lowerTranslation: z.ZodOptional<z.ZodNumber>;
        upperTranslation: z.ZodOptional<z.ZodNumber>;
        enableMotor: z.ZodOptional<z.ZodBoolean>;
        motorSpeed: z.ZodOptional<z.ZodNumber>;
        maxMotorForce: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "prismatic";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        enableMotor?: boolean;
        motorSpeed?: number;
        axis?: {
            x?: number;
            y?: number;
        };
        lowerTranslation?: number;
        upperTranslation?: number;
        maxMotorForce?: number;
    }, {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "prismatic";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        enableMotor?: boolean;
        motorSpeed?: number;
        axis?: {
            x?: number;
            y?: number;
        };
        lowerTranslation?: number;
        upperTranslation?: number;
        maxMotorForce?: number;
    }>]>, "many">>;
    parallaxConfig: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        layers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            imageUrl: z.ZodOptional<z.ZodString>;
            assetRef: z.ZodOptional<z.ZodString>;
            depth: z.ZodEnum<["sky", "far", "mid", "near"]>;
            parallaxFactor: z.ZodNumber;
            scale: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
            visible: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }, {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    }, {
        enabled?: boolean;
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    }>>;
    tileSheets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        imageUrl: z.ZodString;
        tileWidth: z.ZodNumber;
        tileHeight: z.ZodNumber;
        columns: z.ZodNumber;
        rows: z.ZodNumber;
        spacing: z.ZodOptional<z.ZodNumber>;
        margin: z.ZodOptional<z.ZodNumber>;
        tiles: z.ZodOptional<z.ZodRecord<z.ZodNumber, z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            collision: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"full">, z.ZodLiteral<"platform">, z.ZodObject<{
                polygon: z.ZodArray<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x?: number;
                    y?: number;
                }, {
                    x?: number;
                    y?: number;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            }, {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            }>]>>;
            animation: z.ZodOptional<z.ZodObject<{
                frames: z.ZodArray<z.ZodNumber, "many">;
                fps: z.ZodNumber;
                loop: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            }, {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            }>>;
            promptOverride: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }>>>;
        source: z.ZodOptional<z.ZodEnum<["generated", "uploaded", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        source?: "none" | "generated" | "uploaded";
        spacing?: number;
        rows?: number;
        imageUrl?: string;
        columns?: number;
        margin?: number;
        tileWidth?: number;
        tileHeight?: number;
        tiles?: Record<number, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }>;
    }, {
        id?: string;
        name?: string;
        source?: "none" | "generated" | "uploaded";
        spacing?: number;
        rows?: number;
        imageUrl?: string;
        columns?: number;
        margin?: number;
        tileWidth?: number;
        tileHeight?: number;
        tiles?: Record<number, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }>;
    }>, "many">>;
    tileMaps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        tileSheetId: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        layers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["background", "collision", "foreground", "decoration"]>;
            visible: z.ZodBoolean;
            opacity: z.ZodNumber;
            data: z.ZodArray<z.ZodNumber, "many">;
            parallaxFactor: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }, {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        height?: number;
        width?: number;
        name?: string;
        layers?: {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }[];
        tileSheetId?: string;
    }, {
        id?: string;
        height?: number;
        width?: number;
        name?: string;
        layers?: {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }[];
        tileSheetId?: string;
    }>, "many">>;
    multiplayer: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        maxPlayers: z.ZodNumber;
        syncMode: z.ZodOptional<z.ZodEnum<["host-authoritative", "peer-to-peer"]>>;
        inputDelay: z.ZodOptional<z.ZodNumber>;
        snapshotRate: z.ZodOptional<z.ZodNumber>;
        deltaRate: z.ZodOptional<z.ZodNumber>;
        interpolationDelay: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        maxPlayers?: number;
        syncMode?: "host-authoritative" | "peer-to-peer";
        inputDelay?: number;
        snapshotRate?: number;
        deltaRate?: number;
        interpolationDelay?: number;
    }, {
        enabled?: boolean;
        maxPlayers?: number;
        syncMode?: "host-authoritative" | "peer-to-peer";
        inputDelay?: number;
        snapshotRate?: number;
        deltaRate?: number;
        interpolationDelay?: number;
    }>>;
    loadingScreen: z.ZodOptional<z.ZodObject<{
        backgroundImageUrl: z.ZodOptional<z.ZodString>;
        backgroundAssetRef: z.ZodOptional<z.ZodString>;
        progressBarImageUrl: z.ZodOptional<z.ZodString>;
        progressBarAssetRef: z.ZodOptional<z.ZodString>;
        progressBarFillImageUrl: z.ZodOptional<z.ZodString>;
        progressBarFillAssetRef: z.ZodOptional<z.ZodString>;
        backgroundColor: z.ZodOptional<z.ZodString>;
        progressBarColor: z.ZodOptional<z.ZodString>;
        textColor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor?: string;
        backgroundImageUrl?: string;
        backgroundAssetRef?: string;
        progressBarImageUrl?: string;
        progressBarAssetRef?: string;
        progressBarFillImageUrl?: string;
        progressBarFillAssetRef?: string;
        progressBarColor?: string;
        textColor?: string;
    }, {
        backgroundColor?: string;
        backgroundImageUrl?: string;
        backgroundAssetRef?: string;
        progressBarImageUrl?: string;
        progressBarAssetRef?: string;
        progressBarFillImageUrl?: string;
        progressBarFillAssetRef?: string;
        progressBarColor?: string;
        textColor?: string;
    }>>;
    sounds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        url: z.ZodString;
        assetId: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["sfx", "music"]>;
        loop: z.ZodOptional<z.ZodBoolean>;
        defaultVolume: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "sfx" | "music";
        assetId?: string;
        url?: string;
        loop?: boolean;
        defaultVolume?: number;
    }, {
        type?: "sfx" | "music";
        assetId?: string;
        url?: string;
        loop?: boolean;
        defaultVolume?: number;
    }>>>;
    input: z.ZodOptional<z.ZodObject<{
        tapZones: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            edge: z.ZodEnum<["left", "right", "top", "bottom"]>;
            size: z.ZodNumber;
            button: z.ZodEnum<["left", "right", "up", "down", "jump", "action"]>;
            debugColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }, {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }>, "many">>;
        debugTapZones: z.ZodOptional<z.ZodBoolean>;
        debugInputs: z.ZodOptional<z.ZodBoolean>;
        virtualButtons: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            button: z.ZodEnum<["jump", "action"]>;
            label: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodString>;
            activeColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }, {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }>, "many">>;
        virtualJoystick: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
            knobSize: z.ZodOptional<z.ZodNumber>;
            deadZone: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodString>;
            knobColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        }, {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        }>>;
        virtualDPad: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
            buttonSize: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodString>;
            activeColor: z.ZodOptional<z.ZodString>;
            showDiagonals: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        }, {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        }>>;
        enableHaptics: z.ZodOptional<z.ZodBoolean>;
        tilt: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            sensitivity: z.ZodOptional<z.ZodNumber>;
            updateInterval: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        }, {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tapZones?: {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }[];
        debugTapZones?: boolean;
        debugInputs?: boolean;
        virtualButtons?: {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }[];
        virtualJoystick?: {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        };
        virtualDPad?: {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        };
        enableHaptics?: boolean;
        tilt?: {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        };
    }, {
        tapZones?: {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }[];
        debugTapZones?: boolean;
        debugInputs?: boolean;
        virtualButtons?: {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }[];
        virtualJoystick?: {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        };
        virtualDPad?: {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        };
        enableHaptics?: boolean;
        tilt?: {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        };
    }>>;
    match3: z.ZodOptional<z.ZodObject<{
        gridId: z.ZodString;
        rows: z.ZodNumber;
        cols: z.ZodNumber;
        cellSize: z.ZodNumber;
        piecePrefabs: z.ZodArray<z.ZodString, "many">;
        minMatch: z.ZodOptional<z.ZodNumber>;
        swapDuration: z.ZodOptional<z.ZodNumber>;
        fallDuration: z.ZodOptional<z.ZodNumber>;
        clearDelay: z.ZodOptional<z.ZodNumber>;
        variantSheet: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            groupId: z.ZodString;
            atlasUrl: z.ZodString;
            atlasAssetRef: z.ZodOptional<z.ZodString>;
            metadataUrl: z.ZodOptional<z.ZodString>;
            metadataAssetRef: z.ZodOptional<z.ZodString>;
            layout: z.ZodObject<{
                columns: z.ZodNumber;
                rows: z.ZodNumber;
                cellWidth: z.ZodNumber;
                cellHeight: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            }, {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        }, {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        }>>;
        matchDetection: z.ZodOptional<z.ZodString>;
        scoring: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        rows?: number;
        cols?: number;
        gridId?: string;
        cellSize?: number;
        piecePrefabs?: string[];
        minMatch?: number;
        swapDuration?: number;
        fallDuration?: number;
        clearDelay?: number;
        variantSheet?: {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        };
        matchDetection?: string;
        scoring?: string;
    }, {
        rows?: number;
        cols?: number;
        gridId?: string;
        cellSize?: number;
        piecePrefabs?: string[];
        minMatch?: number;
        swapDuration?: number;
        fallDuration?: number;
        clearDelay?: number;
        variantSheet?: {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        };
        matchDetection?: string;
        scoring?: string;
    }>>;
    tetris: z.ZodOptional<z.ZodObject<{
        gridId: z.ZodString;
        boardWidth: z.ZodNumber;
        boardHeight: z.ZodNumber;
        piecePrefabs: z.ZodArray<z.ZodString, "many">;
        initialDropSpeed: z.ZodOptional<z.ZodNumber>;
        levelSpeedMultiplier: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        gridId?: string;
        piecePrefabs?: string[];
        boardWidth?: number;
        boardHeight?: number;
        initialDropSpeed?: number;
        levelSpeedMultiplier?: number;
    }, {
        gridId?: string;
        piecePrefabs?: string[];
        boardWidth?: number;
        boardHeight?: number;
        initialDropSpeed?: number;
        levelSpeedMultiplier?: number;
    }>>;
    persistence: z.ZodOptional<z.ZodObject<{
        storageKey: z.ZodOptional<z.ZodString>;
        schema: z.ZodUnknown;
        defaultProgress: z.ZodUnknown;
        version: z.ZodNumber;
        autoSave: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        autoSave?: {} & {
            [k: string]: unknown;
        };
        storageKey?: string;
        version?: number;
        schema?: unknown;
        defaultProgress?: unknown;
    }, {
        autoSave?: {} & {
            [k: string]: unknown;
        };
        storageKey?: string;
        version?: number;
        schema?: unknown;
        defaultProgress?: unknown;
    }>>;
    constants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodBoolean]>>>;
    effects: z.ZodOptional<z.ZodObject<{
        /** Effect graph specification — validated separately by the effects compiler */
        graph: z.ZodOptional<z.ZodUnknown>;
        /** Named shader sources that the AI or user can write/edit */
        shaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            /** Filename for the shader, e.g. "paint.gdshader" */
            filename: z.ZodString;
            /** Godot Shading Language source code */
            glsl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            filename?: string;
            glsl?: string;
        }, {
            filename?: string;
            glsl?: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        graph?: unknown;
        shaders?: Record<string, {
            filename?: string;
            glsl?: string;
        }>;
    }, {
        graph?: unknown;
        shaders?: Record<string, {
            filename?: string;
            glsl?: string;
        }>;
    }>>;
    hoverHighlight: z.ZodOptional<z.ZodObject<{
        targetTag: z.ZodString;
        highlightEntityId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        targetTag?: string;
        highlightEntityId?: string;
    }, {
        targetTag?: string;
        highlightEntityId?: string;
    }>>;
    dialogs: z.ZodOptional<z.ZodObject<{
        activeDialogVariable: z.ZodOptional<z.ZodString>;
        dialogs: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            message: z.ZodOptional<z.ZodString>;
            stats: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                variable: z.ZodString;
                format: z.ZodOptional<z.ZodString>;
                binding: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }, {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }>, "many">>;
            dismissible: z.ZodOptional<z.ZodBoolean>;
            dismissEventName: z.ZodOptional<z.ZodString>;
            buttons: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                eventName: z.ZodString;
                data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                variant: z.ZodOptional<z.ZodEnum<["primary", "secondary"]>>;
            }, "strip", z.ZodTypeAny, {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }, {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }>, "many">;
            showOnState: z.ZodOptional<z.ZodEnum<["ready", "won", "lost", "paused"]>>;
            showWhen: z.ZodOptional<z.ZodString>;
            style: z.ZodOptional<z.ZodObject<{
                backgroundColor: z.ZodOptional<z.ZodString>;
                titleColor: z.ZodOptional<z.ZodString>;
                titleFontSize: z.ZodOptional<z.ZodNumber>;
                backdropColor: z.ZodOptional<z.ZodString>;
                width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                borderRadius: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            }, {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }, {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }>, "many">;
        legacyWinDialogFallback: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        activeDialogVariable?: string;
        dialogs?: {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }[];
        legacyWinDialogFallback?: boolean;
    }, {
        activeDialogVariable?: string;
        dialogs?: {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }[];
        legacyWinDialogFallback?: boolean;
    }>>;
    overlay: z.ZodOptional<z.ZodObject<{
        elements: z.ZodArray<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>, "many">;
        theme: z.ZodOptional<z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        elements?: z.objectOutputType<{}, z.ZodTypeAny, "passthrough">[];
        theme?: {} & {
            [k: string]: unknown;
        };
    }, {
        elements?: z.objectInputType<{}, z.ZodTypeAny, "passthrough">[];
        theme?: {} & {
            [k: string]: unknown;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    variables?: Record<string, string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
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
    } | {
        x?: number;
        y?: number;
    }>;
    background?: {
        color?: string;
        type?: "static";
        assetId?: string;
        whatDescription?: string;
        assetRef?: string;
        imageUrl?: string;
        localPath?: string;
    } | {
        type?: "parallax";
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    };
    input?: {
        tapZones?: {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }[];
        debugTapZones?: boolean;
        debugInputs?: boolean;
        virtualButtons?: {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }[];
        virtualJoystick?: {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        };
        virtualDPad?: {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        };
        enableHaptics?: boolean;
        tilt?: {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        };
    };
    camera?: {
        type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
        zoom?: number;
        bounds?: {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        };
        followTarget?: string;
        viewHeight?: number;
        minZoom?: number;
        maxZoom?: number;
        followSmoothing?: number;
        followOffset?: {
            x?: number;
            y?: number;
        };
        deadZone?: {
            height?: number;
            width?: number;
        };
        lookAhead?: {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        };
        autoScroll?: {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        };
        shake?: {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        };
    };
    effects?: {
        graph?: unknown;
        shaders?: Record<string, {
            filename?: string;
            glsl?: string;
        }>;
    };
    world?: {
        gravity?: {
            x?: number;
            y?: number;
        };
        pixelsPerMeter?: number;
        bounds?: {
            height?: number;
            width?: number;
        };
    };
    prefabs?: Record<string, {
        id?: string;
        children?: any[];
        type?: "body";
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        description?: string;
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        whatDescription?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        slots?: Record<string, {
            x?: number;
            y?: number;
            layer?: number;
        }>;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
    }>;
    entities?: {
        id?: string;
        children?: any[];
        transform?: {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        };
        name?: string;
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        visible?: boolean;
        prefab?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
        active?: boolean;
    }[];
    metadata?: {
        id?: string;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        createdAt?: number;
        updatedAt?: number;
        version?: string;
        author?: string;
        slug?: string;
        instructions?: string;
        thumbnailAssetRef?: string;
        titleHeroImageUrl?: string;
        titleHeroAssetRef?: string;
    };
    sounds?: Record<string, {
        type?: "sfx" | "music";
        assetId?: string;
        url?: string;
        loop?: boolean;
        defaultVolume?: number;
    }>;
    dialogs?: {
        activeDialogVariable?: string;
        dialogs?: {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }[];
        legacyWinDialogFallback?: boolean;
    };
    presentation?: {
        fit?: "contain" | "cover";
        aspectRatio?: number | {
            height?: number;
            width?: number;
        };
        letterboxColor?: string;
        orientation?: "portrait" | "landscape" | "any";
    };
    joints?: ({
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "revolute";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        lowerAngle?: number;
        upperAngle?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;
    } | {
        id?: string;
        length?: number;
        type?: "distance";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        anchorA?: {
            x?: number;
            y?: number;
        };
        anchorB?: {
            x?: number;
            y?: number;
        };
        stiffness?: number;
        damping?: number;
    } | {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "weld";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        stiffness?: number;
        damping?: number;
    } | {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "prismatic";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        enableMotor?: boolean;
        motorSpeed?: number;
        axis?: {
            x?: number;
            y?: number;
        };
        lowerTranslation?: number;
        upperTranslation?: number;
        maxMotorForce?: number;
    })[];
    parallaxConfig?: {
        enabled?: boolean;
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    };
    tileSheets?: {
        id?: string;
        name?: string;
        source?: "none" | "generated" | "uploaded";
        spacing?: number;
        rows?: number;
        imageUrl?: string;
        columns?: number;
        margin?: number;
        tileWidth?: number;
        tileHeight?: number;
        tiles?: Record<number, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }>;
    }[];
    tileMaps?: {
        id?: string;
        height?: number;
        width?: number;
        name?: string;
        layers?: {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }[];
        tileSheetId?: string;
    }[];
    multiplayer?: {
        enabled?: boolean;
        maxPlayers?: number;
        syncMode?: "host-authoritative" | "peer-to-peer";
        inputDelay?: number;
        snapshotRate?: number;
        deltaRate?: number;
        interpolationDelay?: number;
    };
    loadingScreen?: {
        backgroundColor?: string;
        backgroundImageUrl?: string;
        backgroundAssetRef?: string;
        progressBarImageUrl?: string;
        progressBarAssetRef?: string;
        progressBarFillImageUrl?: string;
        progressBarFillAssetRef?: string;
        progressBarColor?: string;
        textColor?: string;
    };
    match3?: {
        rows?: number;
        cols?: number;
        gridId?: string;
        cellSize?: number;
        piecePrefabs?: string[];
        minMatch?: number;
        swapDuration?: number;
        fallDuration?: number;
        clearDelay?: number;
        variantSheet?: {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        };
        matchDetection?: string;
        scoring?: string;
    };
    tetris?: {
        gridId?: string;
        piecePrefabs?: string[];
        boardWidth?: number;
        boardHeight?: number;
        initialDropSpeed?: number;
        levelSpeedMultiplier?: number;
    };
    persistence?: {
        autoSave?: {} & {
            [k: string]: unknown;
        };
        storageKey?: string;
        version?: number;
        schema?: unknown;
        defaultProgress?: unknown;
    };
    constants?: Record<string, string | number | boolean>;
    hoverHighlight?: {
        targetTag?: string;
        highlightEntityId?: string;
    };
    overlay?: {
        elements?: z.objectOutputType<{}, z.ZodTypeAny, "passthrough">[];
        theme?: {} & {
            [k: string]: unknown;
        };
    };
}, {
    variables?: Record<string, string | number | boolean | {
        expr?: string;
        debugName?: string;
        cache?: "none" | "frame";
    } | {
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
    } | {
        x?: number;
        y?: number;
    }>;
    background?: {
        color?: string;
        type?: "static";
        assetId?: string;
        whatDescription?: string;
        assetRef?: string;
        imageUrl?: string;
        localPath?: string;
    } | {
        type?: "parallax";
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    };
    input?: {
        tapZones?: {
            id?: string;
            button?: "left" | "right" | "up" | "down" | "jump" | "action";
            edge?: "left" | "right" | "bottom" | "top";
            size?: number;
            debugColor?: string;
        }[];
        debugTapZones?: boolean;
        debugInputs?: boolean;
        virtualButtons?: {
            id?: string;
            color?: string;
            label?: string;
            button?: "jump" | "action";
            size?: number;
            activeColor?: string;
        }[];
        virtualJoystick?: {
            id?: string;
            color?: string;
            deadZone?: number;
            size?: number;
            knobSize?: number;
            knobColor?: string;
        };
        virtualDPad?: {
            id?: string;
            color?: string;
            size?: number;
            activeColor?: string;
            buttonSize?: number;
            showDiagonals?: boolean;
        };
        enableHaptics?: boolean;
        tilt?: {
            enabled?: boolean;
            sensitivity?: number;
            updateInterval?: number;
        };
    };
    camera?: {
        type?: "fixed" | "follow" | "follow-x" | "follow-y" | "auto-scroll";
        zoom?: number;
        bounds?: {
            minX?: number;
            maxX?: number;
            minY?: number;
            maxY?: number;
        };
        followTarget?: string;
        viewHeight?: number;
        minZoom?: number;
        maxZoom?: number;
        followSmoothing?: number;
        followOffset?: {
            x?: number;
            y?: number;
        };
        deadZone?: {
            height?: number;
            width?: number;
        };
        lookAhead?: {
            distance?: number;
            enabled?: boolean;
            mode?: "velocity" | "facing" | "input";
            smoothing?: number;
        };
        autoScroll?: {
            direction?: {
                x?: number;
                y?: number;
            };
            speed?: number;
            acceleration?: number;
        };
        shake?: {
            decay?: number;
            maxOffset?: number;
            maxRotation?: number;
        };
    };
    effects?: {
        graph?: unknown;
        shaders?: Record<string, {
            filename?: string;
            glsl?: string;
        }>;
    };
    world?: {
        gravity?: {
            x?: number;
            y?: number;
        };
        pixelsPerMeter?: number;
        bounds?: {
            height?: number;
            width?: number;
        };
    };
    prefabs?: Record<string, {
        id?: string;
        children?: any[];
        type?: "body";
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        description?: string;
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        whatDescription?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        slots?: Record<string, {
            x?: number;
            y?: number;
            layer?: number;
        }>;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
    }>;
    entities?: {
        id?: string;
        children?: any[];
        transform?: {
            x?: number;
            y?: number;
            angle?: number;
            scaleX?: number;
            scaleY?: number;
        };
        name?: string;
        physics?: {
            bodyType?: "kinematic" | "static" | "dynamic";
            mass?: number;
            density?: number;
            gravityScale?: number;
            linearDamping?: number;
            angularDamping?: number;
            fixedRotation?: boolean;
            ccd?: boolean;
            initialVelocity?: {
                x?: number;
                y?: number;
            };
            initialAngularVelocity?: number;
        };
        visual?: {
            color?: string;
            type?: "rect";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "circle";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            radius?: number;
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
        } | {
            color?: string;
            type?: "polygon";
            height?: number;
            width?: number;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            vertices?: {
                x?: number;
                y?: number;
            }[];
        } | {
            color?: string;
            type?: "image";
            height?: number;
            width?: number;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            assetId?: string;
            blendMode?: "sub" | "mix" | "add" | "mul";
            tint?: string;
            opacity?: number;
            whatDescription?: string;
            url?: string;
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            strokeColor?: string;
            imageWidth?: number;
            imageHeight?: number;
        } | {
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            text?: string;
            offsetX?: number;
            offsetY?: number;
            blendMode?: "sub" | "mix" | "add" | "mul";
            opacity?: number;
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            strokeWidth?: number;
            fontSize?: number;
            fontFamily?: string;
            strokeColor?: string;
        };
        visible?: boolean;
        prefab?: string;
        character?: {
            upDirection?: "up" | "down";
            snapToGround?: number;
            maxSlopeAngle?: number;
            minSlopeSlideAngle?: number;
            autoStep?: boolean;
            maxAutoStepHeight?: number;
            slideOnSlope?: boolean;
            collisionOffset?: number;
            isGrounded?: boolean;
            floorNormal?: {
                x?: number;
                y?: number;
            };
            floorAngle?: number;
            platformVelocity?: {
                x?: number;
                y?: number;
            };
            hitCeiling?: boolean;
            hitWall?: boolean;
        };
        layer?: number;
        collider?: {
            height?: number;
            width?: number;
            shape?: "box";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            radius?: number;
            shape?: "circle";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            shape?: "polygon";
            vertices?: {
                x?: number;
                y?: number;
            }[];
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        } | {
            height?: number;
            radius?: number;
            shape?: "capsule";
            friction?: number;
            restitution?: number;
            isSensor?: boolean;
            categoryBits?: number;
            maskBits?: number;
        };
        tags?: string[];
        scriptRef?: string;
        active?: boolean;
    }[];
    metadata?: {
        id?: string;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        createdAt?: number;
        updatedAt?: number;
        version?: string;
        author?: string;
        slug?: string;
        instructions?: string;
        thumbnailAssetRef?: string;
        titleHeroImageUrl?: string;
        titleHeroAssetRef?: string;
    };
    sounds?: Record<string, {
        type?: "sfx" | "music";
        assetId?: string;
        url?: string;
        loop?: boolean;
        defaultVolume?: number;
    }>;
    dialogs?: {
        activeDialogVariable?: string;
        dialogs?: {
            id?: string;
            style?: {
                width?: string | number;
                backgroundColor?: string;
                titleColor?: string;
                titleFontSize?: number;
                backdropColor?: string;
                borderRadius?: number;
            };
            title?: string;
            message?: string;
            stats?: {
                label?: string;
                variable?: string;
                format?: string;
                binding?: string;
            }[];
            dismissible?: boolean;
            dismissEventName?: string;
            buttons?: {
                label?: string;
                data?: Record<string, unknown>;
                eventName?: string;
                variant?: "primary" | "secondary";
            }[];
            showOnState?: "ready" | "won" | "lost" | "paused";
            showWhen?: string;
        }[];
        legacyWinDialogFallback?: boolean;
    };
    presentation?: {
        fit?: "contain" | "cover";
        aspectRatio?: number | {
            height?: number;
            width?: number;
        };
        letterboxColor?: string;
        orientation?: "portrait" | "landscape" | "any";
    };
    joints?: ({
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "revolute";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        lowerAngle?: number;
        upperAngle?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maxMotorTorque?: number;
    } | {
        id?: string;
        length?: number;
        type?: "distance";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        anchorA?: {
            x?: number;
            y?: number;
        };
        anchorB?: {
            x?: number;
            y?: number;
        };
        stiffness?: number;
        damping?: number;
    } | {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "weld";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        stiffness?: number;
        damping?: number;
    } | {
        id?: string;
        anchor?: {
            x?: number;
            y?: number;
        };
        type?: "prismatic";
        entityA?: string;
        entityB?: string;
        collideConnected?: boolean;
        enableLimit?: boolean;
        enableMotor?: boolean;
        motorSpeed?: number;
        axis?: {
            x?: number;
            y?: number;
        };
        lowerTranslation?: number;
        upperTranslation?: number;
        maxMotorForce?: number;
    })[];
    parallaxConfig?: {
        enabled?: boolean;
        layers?: {
            id?: string;
            name?: string;
            scale?: number;
            offsetX?: number;
            offsetY?: number;
            depth?: "sky" | "far" | "mid" | "near";
            parallaxFactor?: number;
            visible?: boolean;
            assetRef?: string;
            imageUrl?: string;
        }[];
    };
    tileSheets?: {
        id?: string;
        name?: string;
        source?: "none" | "generated" | "uploaded";
        spacing?: number;
        rows?: number;
        imageUrl?: string;
        columns?: number;
        margin?: number;
        tileWidth?: number;
        tileHeight?: number;
        tiles?: Record<number, {
            name?: string;
            collision?: "none" | "full" | "platform" | {
                polygon?: {
                    x?: number;
                    y?: number;
                }[];
            };
            tags?: string[];
            promptOverride?: string;
            animation?: {
                frames?: number[];
                fps?: number;
                loop?: boolean;
            };
        }>;
    }[];
    tileMaps?: {
        id?: string;
        height?: number;
        width?: number;
        name?: string;
        layers?: {
            id?: string;
            type?: "collision" | "background" | "foreground" | "decoration";
            name?: string;
            opacity?: number;
            parallaxFactor?: number;
            visible?: boolean;
            zIndex?: number;
            data?: number[];
        }[];
        tileSheetId?: string;
    }[];
    multiplayer?: {
        enabled?: boolean;
        maxPlayers?: number;
        syncMode?: "host-authoritative" | "peer-to-peer";
        inputDelay?: number;
        snapshotRate?: number;
        deltaRate?: number;
        interpolationDelay?: number;
    };
    loadingScreen?: {
        backgroundColor?: string;
        backgroundImageUrl?: string;
        backgroundAssetRef?: string;
        progressBarImageUrl?: string;
        progressBarAssetRef?: string;
        progressBarFillImageUrl?: string;
        progressBarFillAssetRef?: string;
        progressBarColor?: string;
        textColor?: string;
    };
    match3?: {
        rows?: number;
        cols?: number;
        gridId?: string;
        cellSize?: number;
        piecePrefabs?: string[];
        minMatch?: number;
        swapDuration?: number;
        fallDuration?: number;
        clearDelay?: number;
        variantSheet?: {
            enabled?: boolean;
            layout?: {
                rows?: number;
                columns?: number;
                cellWidth?: number;
                cellHeight?: number;
            };
            groupId?: string;
            atlasUrl?: string;
            atlasAssetRef?: string;
            metadataUrl?: string;
            metadataAssetRef?: string;
        };
        matchDetection?: string;
        scoring?: string;
    };
    tetris?: {
        gridId?: string;
        piecePrefabs?: string[];
        boardWidth?: number;
        boardHeight?: number;
        initialDropSpeed?: number;
        levelSpeedMultiplier?: number;
    };
    persistence?: {
        autoSave?: {} & {
            [k: string]: unknown;
        };
        storageKey?: string;
        version?: number;
        schema?: unknown;
        defaultProgress?: unknown;
    };
    constants?: Record<string, string | number | boolean>;
    hoverHighlight?: {
        targetTag?: string;
        highlightEntityId?: string;
    };
    overlay?: {
        elements?: z.objectInputType<{}, z.ZodTypeAny, "passthrough">[];
        theme?: {} & {
            [k: string]: unknown;
        };
    };
}>;
export type GameDefinitionInput = z.infer<typeof GameDefinitionSchema>;
export { TuningConfigSchema, VariableCategorySchema, VariableWithTuningSchema, } from "../expressions/schema-helpers";
//# sourceMappingURL=schemas.d.ts.map