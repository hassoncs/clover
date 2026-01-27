[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / DestroyActionSchema

# Variable: DestroyActionSchema

> `const` **DestroyActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"destroy"`\>; `target`: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_id"`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_id"`; `entityId`: `string`; \}, \{ `type`: `"by_id"`; `entityId`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_tag"`\>; `tag`: `ZodString`; `count`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}, \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"collision_entities"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"collision_entities"`; \}, \{ `type`: `"collision_entities"`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"all"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"all"`; \}, \{ `type`: `"all"`; \}\>\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"destroy"`; `target`: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \} \| \{ `type`: `"collision_entities"`; \} \| \{ `type`: `"all"`; \}; \}, \{ `type`: `"destroy"`; `target`: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; `count?`: `number`; \} \| \{ `type`: `"collision_entities"`; \} \| \{ `type`: `"all"`; \}; \}\>

Defined in: [types/schemas.ts:346](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L346)
