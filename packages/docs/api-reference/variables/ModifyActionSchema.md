[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ModifyActionSchema

# Variable: ModifyActionSchema

> `const` **ModifyActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"modify"`\>; `target`: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_id"`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_id"`; `entityId`: `string`; \}, \{ `type`: `"by_id"`; `entityId`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"by_tag"`\>; `tag`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"by_tag"`; `tag`: `string`; \}, \{ `type`: `"by_tag"`; `tag`: `string`; \}\>\]\>; `property`: `ZodString`; `operation`: `ZodEnum`\<\[`"set"`, `"add"`, `"multiply"`\]\>; `value`: `ZodUnion`\<\[`ZodNumber`, `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"modify"`; `target`: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; \}; `property`: `string`; `operation`: `"add"` \| `"set"` \| `"multiply"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}, \{ `type`: `"modify"`; `target`: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; \}; `property`: `string`; `operation`: `"add"` \| `"set"` \| `"multiply"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}\>

Defined in: [types/schemas.ts:375](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L375)
