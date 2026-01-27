import { z } from 'zod';

export const GodotVec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export type GodotVec2 = z.infer<typeof GodotVec2Schema>;

export const GodotBodyTypeSchema = z.enum(['static', 'dynamic', 'kinematic', 'sensor']);

export type GodotBodyType = z.infer<typeof GodotBodyTypeSchema>;

export const GodotSceneNodePhysicsSchema = z.object({
  bodyType: GodotBodyTypeSchema,
  mass: z.number().optional(),
  sleeping: z.boolean().optional(),
  velocity: GodotVec2Schema.optional(),
  angularVelocity: z.number().optional(),
});

export type GodotSceneNodePhysics = z.infer<typeof GodotSceneNodePhysicsSchema>;

export const GodotSceneNodeSpriteSchema = z.object({
  texture: z.string().nullable(),
  modulate: z.string(),
});

export type GodotSceneNodeSprite = z.infer<typeof GodotSceneNodeSpriteSchema>;

export const GodotSceneNodeSchema = z.object({
  name: z.string(),
  id: z.string(),
  entityId: z.string().optional(),
  type: z.string(),
  template: z.string().optional(),
  position: GodotVec2Schema,
  angle: z.number(),
  visible: z.boolean().optional(),
  zIndex: z.number().optional(),
  physics: GodotSceneNodePhysicsSchema.optional(),
  sprite: GodotSceneNodeSpriteSchema.optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type GodotSceneNode = z.infer<typeof GodotSceneNodeSchema>;

export const GodotSceneSnapshotSchema = z.object({
  timestamp: z.number(),
  entities: z.array(GodotSceneNodeSchema),
});

export type GodotSceneSnapshot = z.infer<typeof GodotSceneSnapshotSchema>;

export const GodotTransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number(),
});

export type GodotTransform = z.infer<typeof GodotTransformSchema>;

export const GodotTransformsMapSchema = z.record(z.string(), GodotTransformSchema);

export type GodotTransformsMap = z.infer<typeof GodotTransformsMapSchema>;

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

export type GodotWorldInfo = z.infer<typeof GodotWorldInfoSchema>;

export const GodotCameraInfoSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  zoom: z.number().optional(),
  target: z.string().optional(),
});

export type GodotCameraInfo = z.infer<typeof GodotCameraInfoSchema>;

export const GodotViewportInfoSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});

export type GodotViewportInfo = z.infer<typeof GodotViewportInfoSchema>;

export const GodotContactInfoSchema = z.object({
  point: GodotVec2Schema,
  normal: GodotVec2Schema,
  normalImpulse: z.number(),
  tangentImpulse: z.number(),
});

export type GodotContactInfo = z.infer<typeof GodotContactInfoSchema>;

export const GodotCollisionEventSchema = z.object({
  entityA: z.string(),
  entityB: z.string(),
  contacts: z.array(GodotContactInfoSchema).optional(),
});

export type GodotCollisionEvent = z.infer<typeof GodotCollisionEventSchema>;

export const GodotScreenshotResultSchema = z.object({
  base64: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  timestamp: z.number().optional(),
  frameId: z.number().optional(),
});

export type GodotScreenshotResult = z.infer<typeof GodotScreenshotResultSchema>;

export const GodotPropertiesPayloadSchema = z.object({
  entities: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export type GodotPropertiesPayload = z.infer<typeof GodotPropertiesPayloadSchema>;

export function parseGodotSceneSnapshot(data: unknown): GodotSceneSnapshot {
  return GodotSceneSnapshotSchema.parse(data);
}

export function safeParseGodotSceneSnapshot(data: unknown): GodotSceneSnapshot | null {
  const result = GodotSceneSnapshotSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[GodotBridge] Invalid scene snapshot:', result.error.format());
  return null;
}

export function parseGodotTransformsMap(data: unknown): GodotTransformsMap {
  return GodotTransformsMapSchema.parse(data);
}

export function safeParseGodotTransformsMap(data: unknown): GodotTransformsMap | null {
  const result = GodotTransformsMapSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[GodotBridge] Invalid transforms map:', result.error.format());
  return null;
}

export function parseGodotCollisionEvent(data: unknown): GodotCollisionEvent {
  return GodotCollisionEventSchema.parse(data);
}

export function safeParseGodotCollisionEvent(data: unknown): GodotCollisionEvent | null {
  const result = GodotCollisionEventSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[GodotBridge] Invalid collision event:', result.error.format());
  return null;
}
