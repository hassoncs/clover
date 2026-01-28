[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GodotSceneNodePhysicsSchema

# Variable: GodotSceneNodePhysicsSchema

> `const` **GodotSceneNodePhysicsSchema**: `ZodObject`\<\{ `bodyType`: `ZodEnum`\<\[`"static"`, `"dynamic"`, `"kinematic"`, `"sensor"`\]\>; `mass`: `ZodOptional`\<`ZodNumber`\>; `sleeping`: `ZodOptional`\<`ZodBoolean`\>; `velocity`: `ZodOptional`\<`ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>\>; `angularVelocity`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `bodyType`: `"static"` \| `"dynamic"` \| `"kinematic"` \| `"sensor"`; `mass?`: `number`; `sleeping?`: `boolean`; `velocity?`: \{ `x`: `number`; `y`: `number`; \}; `angularVelocity?`: `number`; \}, \{ `bodyType`: `"static"` \| `"dynamic"` \| `"kinematic"` \| `"sensor"`; `mass?`: `number`; `sleeping?`: `boolean`; `velocity?`: \{ `x`: `number`; `y`: `number`; \}; `angularVelocity?`: `number`; \}\>

Defined in: [types/godot-bridge.ts:14](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/godot-bridge.ts#L14)
