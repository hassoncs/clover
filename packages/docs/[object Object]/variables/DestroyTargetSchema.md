[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / DestroyTargetSchema

# Variable: DestroyTargetSchema

> `const` **DestroyTargetSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_id"`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_id"`; `entityId`: `string`; \}, \{ `type`: `"by_id"`; `entityId`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_tag"`\>; `tag`: `ZodString`; `count`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"collision_entities"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"collision_entities"`; \}, \{ `type`: `"collision_entities"`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"all"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"all"`; \}, \{ `type`: `"all"`; \}\>\]\>

Defined in: [types/schemas.ts:381](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L381)
