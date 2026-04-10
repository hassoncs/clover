import { z } from 'zod';
export declare const GodotVec2Schema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
}, {
    x?: number;
    y?: number;
}>;
export type GodotVec2 = z.infer<typeof GodotVec2Schema>;
export declare const GodotBodyTypeSchema: z.ZodEnum<["static", "dynamic", "kinematic", "sensor"]>;
export type GodotBodyType = z.infer<typeof GodotBodyTypeSchema>;
export declare const GodotSceneNodePhysicsSchema: z.ZodObject<{
    bodyType: z.ZodEnum<["static", "dynamic", "kinematic", "sensor"]>;
    mass: z.ZodOptional<z.ZodNumber>;
    sleeping: z.ZodOptional<z.ZodBoolean>;
    velocity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
    angularVelocity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    velocity?: {
        x?: number;
        y?: number;
    };
    angularVelocity?: number;
    bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
    mass?: number;
    sleeping?: boolean;
}, {
    velocity?: {
        x?: number;
        y?: number;
    };
    angularVelocity?: number;
    bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
    mass?: number;
    sleeping?: boolean;
}>;
export type GodotSceneNodePhysics = z.infer<typeof GodotSceneNodePhysicsSchema>;
export declare const GodotSceneNodeSpriteSchema: z.ZodObject<{
    texture: z.ZodNullable<z.ZodString>;
    modulate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    texture?: string;
    modulate?: string;
}, {
    texture?: string;
    modulate?: string;
}>;
export type GodotSceneNodeSprite = z.infer<typeof GodotSceneNodeSpriteSchema>;
export declare const GodotSceneNodeSchema: z.ZodObject<{
    name: z.ZodString;
    id: z.ZodString;
    entityId: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    prefab: z.ZodOptional<z.ZodString>;
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
    angle: z.ZodNumber;
    visible: z.ZodOptional<z.ZodBoolean>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    physics: z.ZodOptional<z.ZodObject<{
        bodyType: z.ZodEnum<["static", "dynamic", "kinematic", "sensor"]>;
        mass: z.ZodOptional<z.ZodNumber>;
        sleeping: z.ZodOptional<z.ZodBoolean>;
        velocity: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>>;
        angularVelocity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        velocity?: {
            x?: number;
            y?: number;
        };
        angularVelocity?: number;
        bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
        mass?: number;
        sleeping?: boolean;
    }, {
        velocity?: {
            x?: number;
            y?: number;
        };
        angularVelocity?: number;
        bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
        mass?: number;
        sleeping?: boolean;
    }>>;
    sprite: z.ZodOptional<z.ZodObject<{
        texture: z.ZodNullable<z.ZodString>;
        modulate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        texture?: string;
        modulate?: string;
    }, {
        texture?: string;
        modulate?: string;
    }>>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: string;
    angle?: number;
    name?: string;
    physics?: {
        velocity?: {
            x?: number;
            y?: number;
        };
        angularVelocity?: number;
        bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
        mass?: number;
        sleeping?: boolean;
    };
    sprite?: {
        texture?: string;
        modulate?: string;
    };
    position?: {
        x?: number;
        y?: number;
    };
    visible?: boolean;
    meta?: Record<string, string | number | boolean>;
    entityId?: string;
    prefab?: string;
    zIndex?: number;
}, {
    id?: string;
    type?: string;
    angle?: number;
    name?: string;
    physics?: {
        velocity?: {
            x?: number;
            y?: number;
        };
        angularVelocity?: number;
        bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
        mass?: number;
        sleeping?: boolean;
    };
    sprite?: {
        texture?: string;
        modulate?: string;
    };
    position?: {
        x?: number;
        y?: number;
    };
    visible?: boolean;
    meta?: Record<string, string | number | boolean>;
    entityId?: string;
    prefab?: string;
    zIndex?: number;
}>;
export type GodotSceneNode = z.infer<typeof GodotSceneNodeSchema>;
export declare const GodotSceneSnapshotSchema: z.ZodObject<{
    timestamp: z.ZodNumber;
    entities: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        id: z.ZodString;
        entityId: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        prefab: z.ZodOptional<z.ZodString>;
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
        angle: z.ZodNumber;
        visible: z.ZodOptional<z.ZodBoolean>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        physics: z.ZodOptional<z.ZodObject<{
            bodyType: z.ZodEnum<["static", "dynamic", "kinematic", "sensor"]>;
            mass: z.ZodOptional<z.ZodNumber>;
            sleeping: z.ZodOptional<z.ZodBoolean>;
            velocity: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x?: number;
                y?: number;
            }, {
                x?: number;
                y?: number;
            }>>;
            angularVelocity: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        }, {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        }>>;
        sprite: z.ZodOptional<z.ZodObject<{
            texture: z.ZodNullable<z.ZodString>;
            modulate: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            texture?: string;
            modulate?: string;
        }, {
            texture?: string;
            modulate?: string;
        }>>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: string;
        angle?: number;
        name?: string;
        physics?: {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        };
        sprite?: {
            texture?: string;
            modulate?: string;
        };
        position?: {
            x?: number;
            y?: number;
        };
        visible?: boolean;
        meta?: Record<string, string | number | boolean>;
        entityId?: string;
        prefab?: string;
        zIndex?: number;
    }, {
        id?: string;
        type?: string;
        angle?: number;
        name?: string;
        physics?: {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        };
        sprite?: {
            texture?: string;
            modulate?: string;
        };
        position?: {
            x?: number;
            y?: number;
        };
        visible?: boolean;
        meta?: Record<string, string | number | boolean>;
        entityId?: string;
        prefab?: string;
        zIndex?: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entities?: {
        id?: string;
        type?: string;
        angle?: number;
        name?: string;
        physics?: {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        };
        sprite?: {
            texture?: string;
            modulate?: string;
        };
        position?: {
            x?: number;
            y?: number;
        };
        visible?: boolean;
        meta?: Record<string, string | number | boolean>;
        entityId?: string;
        prefab?: string;
        zIndex?: number;
    }[];
    timestamp?: number;
}, {
    entities?: {
        id?: string;
        type?: string;
        angle?: number;
        name?: string;
        physics?: {
            velocity?: {
                x?: number;
                y?: number;
            };
            angularVelocity?: number;
            bodyType?: "kinematic" | "static" | "dynamic" | "sensor";
            mass?: number;
            sleeping?: boolean;
        };
        sprite?: {
            texture?: string;
            modulate?: string;
        };
        position?: {
            x?: number;
            y?: number;
        };
        visible?: boolean;
        meta?: Record<string, string | number | boolean>;
        entityId?: string;
        prefab?: string;
        zIndex?: number;
    }[];
    timestamp?: number;
}>;
export type GodotSceneSnapshot = z.infer<typeof GodotSceneSnapshotSchema>;
export declare const GodotTransformSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    angle: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
    angle?: number;
}, {
    x?: number;
    y?: number;
    angle?: number;
}>;
export type GodotTransform = z.infer<typeof GodotTransformSchema>;
export declare const GodotTransformsMapSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    angle: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
    angle?: number;
}, {
    x?: number;
    y?: number;
    angle?: number;
}>>;
export type GodotTransformsMap = z.infer<typeof GodotTransformsMapSchema>;
export declare const GodotWorldInfoSchema: z.ZodObject<{
    pixelsPerMeter: z.ZodOptional<z.ZodNumber>;
    gravity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>>;
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
export type GodotWorldInfo = z.infer<typeof GodotWorldInfoSchema>;
export declare const GodotCameraInfoSchema: z.ZodObject<{
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    zoom: z.ZodOptional<z.ZodNumber>;
    target: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    x?: number;
    y?: number;
    zoom?: number;
    target?: string;
}, {
    x?: number;
    y?: number;
    zoom?: number;
    target?: string;
}>;
export type GodotCameraInfo = z.infer<typeof GodotCameraInfoSchema>;
export declare const GodotViewportInfoSchema: z.ZodObject<{
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    height?: number;
    width?: number;
}, {
    height?: number;
    width?: number;
}>;
export type GodotViewportInfo = z.infer<typeof GodotViewportInfoSchema>;
export declare const GodotContactInfoSchema: z.ZodObject<{
    point: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    normal: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x?: number;
        y?: number;
    }, {
        x?: number;
        y?: number;
    }>;
    normalImpulse: z.ZodNumber;
    tangentImpulse: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    normal?: {
        x?: number;
        y?: number;
    };
    point?: {
        x?: number;
        y?: number;
    };
    normalImpulse?: number;
    tangentImpulse?: number;
}, {
    normal?: {
        x?: number;
        y?: number;
    };
    point?: {
        x?: number;
        y?: number;
    };
    normalImpulse?: number;
    tangentImpulse?: number;
}>;
export type GodotContactInfo = z.infer<typeof GodotContactInfoSchema>;
export declare const GodotCollisionEventSchema: z.ZodObject<{
    entityA: z.ZodString;
    entityB: z.ZodString;
    contacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        point: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        normal: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x?: number;
            y?: number;
        }, {
            x?: number;
            y?: number;
        }>;
        normalImpulse: z.ZodNumber;
        tangentImpulse: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        normal?: {
            x?: number;
            y?: number;
        };
        point?: {
            x?: number;
            y?: number;
        };
        normalImpulse?: number;
        tangentImpulse?: number;
    }, {
        normal?: {
            x?: number;
            y?: number;
        };
        point?: {
            x?: number;
            y?: number;
        };
        normalImpulse?: number;
        tangentImpulse?: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    entityA?: string;
    entityB?: string;
    contacts?: {
        normal?: {
            x?: number;
            y?: number;
        };
        point?: {
            x?: number;
            y?: number;
        };
        normalImpulse?: number;
        tangentImpulse?: number;
    }[];
}, {
    entityA?: string;
    entityB?: string;
    contacts?: {
        normal?: {
            x?: number;
            y?: number;
        };
        point?: {
            x?: number;
            y?: number;
        };
        normalImpulse?: number;
        tangentImpulse?: number;
    }[];
}>;
export type GodotCollisionEvent = z.infer<typeof GodotCollisionEventSchema>;
export declare const GodotScreenshotResultSchema: z.ZodObject<{
    base64: z.ZodString;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodOptional<z.ZodNumber>;
    frameId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    height?: number;
    width?: number;
    frameId?: number;
    timestamp?: number;
    base64?: string;
}, {
    height?: number;
    width?: number;
    frameId?: number;
    timestamp?: number;
    base64?: string;
}>;
export type GodotScreenshotResult = z.infer<typeof GodotScreenshotResultSchema>;
export declare const GodotPropertiesPayloadSchema: z.ZodObject<{
    entities: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    entities?: Record<string, Record<string, unknown>>;
}, {
    entities?: Record<string, Record<string, unknown>>;
}>;
export type GodotPropertiesPayload = z.infer<typeof GodotPropertiesPayloadSchema>;
export declare function parseGodotSceneSnapshot(data: unknown): GodotSceneSnapshot;
export declare function safeParseGodotSceneSnapshot(data: unknown): GodotSceneSnapshot | null;
export declare function parseGodotTransformsMap(data: unknown): GodotTransformsMap;
export declare function safeParseGodotTransformsMap(data: unknown): GodotTransformsMap | null;
export declare function parseGodotCollisionEvent(data: unknown): GodotCollisionEvent;
export declare function safeParseGodotCollisionEvent(data: unknown): GodotCollisionEvent | null;
//# sourceMappingURL=godot-bridge.d.ts.map