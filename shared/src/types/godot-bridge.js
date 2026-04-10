import { z } from 'zod';
export const GodotVec2Schema = z.object({
    x: z.number(),
    y: z.number(),
});
export const GodotBodyTypeSchema = z.enum(['static', 'dynamic', 'kinematic', 'sensor']);
export const GodotSceneNodePhysicsSchema = z.object({
    bodyType: GodotBodyTypeSchema,
    mass: z.number().optional(),
    sleeping: z.boolean().optional(),
    velocity: GodotVec2Schema.optional(),
    angularVelocity: z.number().optional(),
});
export const GodotSceneNodeSpriteSchema = z.object({
    texture: z.string().nullable(),
    modulate: z.string(),
});
export const GodotSceneNodeSchema = z.object({
    name: z.string(),
    id: z.string(),
    entityId: z.string().optional(),
    type: z.string(),
    prefab: z.string().optional(),
    position: GodotVec2Schema,
    angle: z.number(),
    visible: z.boolean().optional(),
    zIndex: z.number().optional(),
    physics: GodotSceneNodePhysicsSchema.optional(),
    sprite: GodotSceneNodeSpriteSchema.optional(),
    meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export const GodotSceneSnapshotSchema = z.object({
    timestamp: z.number(),
    entities: z.array(GodotSceneNodeSchema),
});
export const GodotTransformSchema = z.object({
    x: z.number(),
    y: z.number(),
    angle: z.number(),
});
export const GodotTransformsMapSchema = z.record(z.string(), GodotTransformSchema);
export const GodotWorldInfoSchema = z.object({
    pixelsPerMeter: z.number().optional(),
    gravity: GodotVec2Schema.optional(),
    bounds: z
        .object({
        width: z.number(),
        height: z.number(),
    })
        .optional(),
});
export const GodotCameraInfoSchema = z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    zoom: z.number().optional(),
    target: z.string().optional(),
});
export const GodotViewportInfoSchema = z.object({
    width: z.number().optional(),
    height: z.number().optional(),
});
export const GodotContactInfoSchema = z.object({
    point: GodotVec2Schema,
    normal: GodotVec2Schema,
    normalImpulse: z.number(),
    tangentImpulse: z.number(),
});
export const GodotCollisionEventSchema = z.object({
    entityA: z.string(),
    entityB: z.string(),
    contacts: z.array(GodotContactInfoSchema).optional(),
});
export const GodotScreenshotResultSchema = z.object({
    base64: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    timestamp: z.number().optional(),
    frameId: z.number().optional(),
});
export const GodotPropertiesPayloadSchema = z.object({
    entities: z.record(z.string(), z.record(z.string(), z.unknown())),
});
export function parseGodotSceneSnapshot(data) {
    return GodotSceneSnapshotSchema.parse(data);
}
export function safeParseGodotSceneSnapshot(data) {
    const result = GodotSceneSnapshotSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.warn('[GodotBridge] Invalid scene snapshot:', result.error.format());
    return null;
}
export function parseGodotTransformsMap(data) {
    return GodotTransformsMapSchema.parse(data);
}
export function safeParseGodotTransformsMap(data) {
    const result = GodotTransformsMapSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.warn('[GodotBridge] Invalid transforms map:', result.error.format());
    return null;
}
export function parseGodotCollisionEvent(data) {
    return GodotCollisionEventSchema.parse(data);
}
export function safeParseGodotCollisionEvent(data) {
    const result = GodotCollisionEventSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.warn('[GodotBridge] Invalid collision event:', result.error.format());
    return null;
}
//# sourceMappingURL=godot-bridge.js.map