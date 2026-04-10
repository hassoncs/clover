import { z } from "zod";
export declare const DesignShadowSchema: z.ZodObject<{
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
export declare const DesignGradientSchema: z.ZodObject<{
    type: z.ZodEnum<["linear", "radial"]>;
    stops: z.ZodArray<z.ZodObject<{
        color: z.ZodString;
        position: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        color?: string;
        position?: number;
    }, {
        color?: string;
        position?: number;
    }>, "many">;
    angle: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "linear" | "radial";
    angle?: number;
    stops?: {
        color?: string;
        position?: number;
    }[];
}, {
    type?: "linear" | "radial";
    angle?: number;
    stops?: {
        color?: string;
        position?: number;
    }[];
}>;
export declare const DesignElementBaseSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
}, {
    id?: string;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
}>;
export declare const DesignElementRectSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    cornerRadius: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "rect";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
}, {
    id?: string;
    fill?: string;
    type?: "rect";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
}>;
export declare const DesignElementTextSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    content: z.ZodString;
    fontSize: z.ZodNumber;
    fontWeight: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    content?: string;
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    fontSize?: number;
    fontWeight?: string;
}, {
    id?: string;
    content?: string;
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    fontSize?: number;
    fontWeight?: string;
}>;
export declare const DesignElementImageSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    assetRef: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    fit: z.ZodOptional<z.ZodEnum<["contain", "cover", "fill"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "image";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    assetRef?: string;
    imageUrl?: string;
    fit?: "fill" | "contain" | "cover";
}, {
    id?: string;
    type?: "image";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    assetRef?: string;
    imageUrl?: string;
    fit?: "fill" | "contain" | "cover";
}>;
export declare const DesignElementCircleSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "circle";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
}, {
    id?: string;
    fill?: string;
    type?: "circle";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
}>;
export declare const DesignElementLineSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"line">;
    x1: z.ZodNumber;
    y1: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "line";
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}, {
    id?: string;
    type?: "line";
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}>;
export declare const DesignElementPathSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"path">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    data: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "path";
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    data?: string;
}, {
    id?: string;
    fill?: string;
    type?: "path";
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    data?: string;
}>;
export declare const DesignElementGroupSchema: z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"group">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    childIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "group";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    childIds?: string[];
}, {
    id?: string;
    type?: "group";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    childIds?: string[];
}>;
export declare const DesignElementSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    cornerRadius: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "rect";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
}, {
    id?: string;
    fill?: string;
    type?: "rect";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    content: z.ZodString;
    fontSize: z.ZodNumber;
    fontWeight: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    content?: string;
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    fontSize?: number;
    fontWeight?: string;
}, {
    id?: string;
    content?: string;
    color?: string;
    type?: "text";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    align?: "center" | "left" | "right";
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    fontSize?: number;
    fontWeight?: string;
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    assetRef: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    fit: z.ZodOptional<z.ZodEnum<["contain", "cover", "fill"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "image";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    assetRef?: string;
    imageUrl?: string;
    fit?: "fill" | "contain" | "cover";
}, {
    id?: string;
    type?: "image";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    assetRef?: string;
    imageUrl?: string;
    fit?: "fill" | "contain" | "cover";
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "circle";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
}, {
    id?: string;
    fill?: string;
    type?: "circle";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"line">;
    x1: z.ZodNumber;
    y1: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "line";
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}, {
    id?: string;
    type?: "line";
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"path">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    data: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    fill?: string;
    type?: "path";
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    data?: string;
}, {
    id?: string;
    fill?: string;
    type?: "path";
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    stroke?: string;
    strokeWidth?: number;
    data?: string;
}>, z.ZodObject<{
    id: z.ZodString;
    zIndex: z.ZodNumber;
    opacity: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
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
    gradient: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["linear", "radial"]>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            color?: string;
            position?: number;
        }, {
            color?: string;
            position?: number;
        }>, "many">;
        angle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }, {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    }>>;
} & {
    type: z.ZodLiteral<"group">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    childIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "group";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    childIds?: string[];
}, {
    id?: string;
    type?: "group";
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    rotation?: number;
    opacity?: number;
    gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops?: {
            color?: string;
            position?: number;
        }[];
    };
    zIndex?: number;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    childIds?: string[];
}>]>;
export type DesignElement = z.infer<typeof DesignElementSchema>;
export declare const DesignFrameSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    elements: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"rect">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        fill: z.ZodOptional<z.ZodString>;
        stroke: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        cornerRadius: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        fill?: string;
        type?: "rect";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
    }, {
        id?: string;
        fill?: string;
        type?: "rect";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"text">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        content: z.ZodString;
        fontSize: z.ZodNumber;
        fontWeight: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        content?: string;
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        fontSize?: number;
        fontWeight?: string;
    }, {
        id?: string;
        content?: string;
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        fontSize?: number;
        fontWeight?: string;
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"image">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        assetRef: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        fit: z.ZodOptional<z.ZodEnum<["contain", "cover", "fill"]>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "image";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        assetRef?: string;
        imageUrl?: string;
        fit?: "fill" | "contain" | "cover";
    }, {
        id?: string;
        type?: "image";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        assetRef?: string;
        imageUrl?: string;
        fit?: "fill" | "contain" | "cover";
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"circle">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        fill: z.ZodOptional<z.ZodString>;
        stroke: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        fill?: string;
        type?: "circle";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
    }, {
        id?: string;
        fill?: string;
        type?: "circle";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"line">;
        x1: z.ZodNumber;
        y1: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
        stroke: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "line";
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    }, {
        id?: string;
        type?: "line";
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"path">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        data: z.ZodString;
        fill: z.ZodOptional<z.ZodString>;
        stroke: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        fill?: string;
        type?: "path";
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        data?: string;
    }, {
        id?: string;
        fill?: string;
        type?: "path";
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        data?: string;
    }>, z.ZodObject<{
        id: z.ZodString;
        zIndex: z.ZodNumber;
        opacity: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
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
        gradient: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["linear", "radial"]>;
            stops: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                position: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                color?: string;
                position?: number;
            }, {
                color?: string;
                position?: number;
            }>, "many">;
            angle: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }, {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        }>>;
    } & {
        type: z.ZodLiteral<"group">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        childIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "group";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        childIds?: string[];
    }, {
        id?: string;
        type?: "group";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        childIds?: string[];
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    id?: string;
    title?: string;
    height?: number;
    width?: number;
    position?: {
        x?: number;
        y?: number;
    };
    elements?: ({
        id?: string;
        fill?: string;
        type?: "rect";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
    } | {
        id?: string;
        content?: string;
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        fontSize?: number;
        fontWeight?: string;
    } | {
        id?: string;
        type?: "image";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        assetRef?: string;
        imageUrl?: string;
        fit?: "fill" | "contain" | "cover";
    } | {
        id?: string;
        fill?: string;
        type?: "circle";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
    } | {
        id?: string;
        type?: "line";
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | {
        id?: string;
        fill?: string;
        type?: "path";
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        data?: string;
    } | {
        id?: string;
        type?: "group";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        childIds?: string[];
    })[];
}, {
    id?: string;
    title?: string;
    height?: number;
    width?: number;
    position?: {
        x?: number;
        y?: number;
    };
    elements?: ({
        id?: string;
        fill?: string;
        type?: "rect";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
    } | {
        id?: string;
        content?: string;
        color?: string;
        type?: "text";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        align?: "center" | "left" | "right";
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        fontSize?: number;
        fontWeight?: string;
    } | {
        id?: string;
        type?: "image";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        assetRef?: string;
        imageUrl?: string;
        fit?: "fill" | "contain" | "cover";
    } | {
        id?: string;
        fill?: string;
        type?: "circle";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
    } | {
        id?: string;
        type?: "line";
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | {
        id?: string;
        fill?: string;
        type?: "path";
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        stroke?: string;
        strokeWidth?: number;
        data?: string;
    } | {
        id?: string;
        type?: "group";
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        rotation?: number;
        opacity?: number;
        gradient?: {
            type?: "linear" | "radial";
            angle?: number;
            stops?: {
                color?: string;
                position?: number;
            }[];
        };
        zIndex?: number;
        shadow?: {
            color?: string;
            offsetX?: number;
            offsetY?: number;
            blur?: number;
        };
        childIds?: string[];
    })[];
}>;
export type DesignFrame = z.infer<typeof DesignFrameSchema>;
export declare const DesignDocumentSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.1">;
    metadata: z.ZodObject<{
        title: z.ZodString;
        gameId: z.ZodString;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        title?: string;
        createdAt?: number;
        updatedAt?: number;
        gameId?: string;
    }, {
        title?: string;
        createdAt?: number;
        updatedAt?: number;
        gameId?: string;
    }>;
    frames: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        elements: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"rect">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            fill: z.ZodOptional<z.ZodString>;
            stroke: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
            cornerRadius: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        }, {
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"text">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            content: z.ZodString;
            fontSize: z.ZodNumber;
            fontWeight: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        }, {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"image">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            assetRef: z.ZodOptional<z.ZodString>;
            imageUrl: z.ZodOptional<z.ZodString>;
            fit: z.ZodOptional<z.ZodEnum<["contain", "cover", "fill"]>>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        }, {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"circle">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            fill: z.ZodOptional<z.ZodString>;
            stroke: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        }, {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"line">;
            x1: z.ZodNumber;
            y1: z.ZodNumber;
            x2: z.ZodNumber;
            y2: z.ZodNumber;
            stroke: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        }, {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"path">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            data: z.ZodString;
            fill: z.ZodOptional<z.ZodString>;
            stroke: z.ZodOptional<z.ZodString>;
            strokeWidth: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        }, {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        }>, z.ZodObject<{
            id: z.ZodString;
            zIndex: z.ZodNumber;
            opacity: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
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
            gradient: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["linear", "radial"]>;
                stops: z.ZodArray<z.ZodObject<{
                    color: z.ZodString;
                    position: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    color?: string;
                    position?: number;
                }, {
                    color?: string;
                    position?: number;
                }>, "many">;
                angle: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }, {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            }>>;
        } & {
            type: z.ZodLiteral<"group">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            childIds: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        }, {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        title?: string;
        height?: number;
        width?: number;
        position?: {
            x?: number;
            y?: number;
        };
        elements?: ({
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        } | {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        } | {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        } | {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        } | {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        } | {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        } | {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        })[];
    }, {
        id?: string;
        title?: string;
        height?: number;
        width?: number;
        position?: {
            x?: number;
            y?: number;
        };
        elements?: ({
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        } | {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        } | {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        } | {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        } | {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        } | {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        } | {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        })[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version?: "1.1";
    metadata?: {
        title?: string;
        createdAt?: number;
        updatedAt?: number;
        gameId?: string;
    };
    frames?: {
        id?: string;
        title?: string;
        height?: number;
        width?: number;
        position?: {
            x?: number;
            y?: number;
        };
        elements?: ({
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        } | {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        } | {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        } | {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        } | {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        } | {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        } | {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        })[];
    }[];
}, {
    version?: "1.1";
    metadata?: {
        title?: string;
        createdAt?: number;
        updatedAt?: number;
        gameId?: string;
    };
    frames?: {
        id?: string;
        title?: string;
        height?: number;
        width?: number;
        position?: {
            x?: number;
            y?: number;
        };
        elements?: ({
            id?: string;
            fill?: string;
            type?: "rect";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            cornerRadius?: number;
        } | {
            id?: string;
            content?: string;
            color?: string;
            type?: "text";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            align?: "center" | "left" | "right";
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            fontSize?: number;
            fontWeight?: string;
        } | {
            id?: string;
            type?: "image";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            assetRef?: string;
            imageUrl?: string;
            fit?: "fill" | "contain" | "cover";
        } | {
            id?: string;
            fill?: string;
            type?: "circle";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
        } | {
            id?: string;
            type?: "line";
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            x1?: number;
            y1?: number;
            x2?: number;
            y2?: number;
        } | {
            id?: string;
            fill?: string;
            type?: "path";
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            stroke?: string;
            strokeWidth?: number;
            data?: string;
        } | {
            id?: string;
            type?: "group";
            height?: number;
            width?: number;
            x?: number;
            y?: number;
            rotation?: number;
            opacity?: number;
            gradient?: {
                type?: "linear" | "radial";
                angle?: number;
                stops?: {
                    color?: string;
                    position?: number;
                }[];
            };
            zIndex?: number;
            shadow?: {
                color?: string;
                offsetX?: number;
                offsetY?: number;
                blur?: number;
            };
            childIds?: string[];
        })[];
    }[];
}>;
export type DesignDocument = z.infer<typeof DesignDocumentSchema>;
export declare class DesignSchemaError extends Error {
    constructor(message: string);
}
export declare function parseDesignDocument(data: unknown): DesignDocument;
export declare function isDesignDocument(data: unknown): data is DesignDocument;
export declare function createEmptyDesignDocument(gameId: string, title: string): DesignDocument;
//# sourceMappingURL=design.d.ts.map