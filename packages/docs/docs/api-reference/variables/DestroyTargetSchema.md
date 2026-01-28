[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / DestroyTargetSchema

# Variable: DestroyTargetSchema

> `const` **DestroyTargetSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_id"`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_id"`; `entityId`: `string`; \}, \{ `type`: `"by_id"`; `entityId`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_tag"`\>; `tag`: `ZodString`; `count`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"collision_entities"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"collision_entities"`; \}, \{ `type`: `"collision_entities"`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"all"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"all"`; \}, \{ `type`: `"all"`; \}\>\]\>

Defined in: [types/schemas.ts:381](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L381)
