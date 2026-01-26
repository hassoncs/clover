[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GodotCollisionEventSchema

# Variable: GodotCollisionEventSchema

> `const` **GodotCollisionEventSchema**: `ZodObject`\<\{ `entityA`: `ZodString`; `entityB`: `ZodString`; `contacts`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `point`: `ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>; `normal`: `ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>; `normalImpulse`: `ZodNumber`; `tangentImpulse`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `point`: \{ `x`: `number`; `y`: `number`; \}; `normal`: \{ `x`: `number`; `y`: `number`; \}; `normalImpulse`: `number`; `tangentImpulse`: `number`; \}, \{ `point`: \{ `x`: `number`; `y`: `number`; \}; `normal`: \{ `x`: `number`; `y`: `number`; \}; `normalImpulse`: `number`; `tangentImpulse`: `number`; \}\>, `"many"`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `entityA`: `string`; `entityB`: `string`; `contacts?`: `object`[]; \}, \{ `entityA`: `string`; `entityB`: `string`; `contacts?`: `object`[]; \}\>

Defined in: [types/godot-bridge.ts:105](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/godot-bridge.ts#L105)
