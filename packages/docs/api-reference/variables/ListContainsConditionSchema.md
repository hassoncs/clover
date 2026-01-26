[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ListContainsConditionSchema

# Variable: ListContainsConditionSchema

> `const` **ListContainsConditionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"list_contains"`\>; `listName`: `ZodString`; `value`: `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>; `negated`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}\>

Defined in: [types/schemas.ts:305](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L305)
