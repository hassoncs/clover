[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ListContainsConditionSchema

# Variable: ListContainsConditionSchema

> `const` **ListContainsConditionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"list_contains"`\>; `listName`: `ZodString`; `value`: `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>; `negated`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}\>

Defined in: [types/schemas.ts:308](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L308)
