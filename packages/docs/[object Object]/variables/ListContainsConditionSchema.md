[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ListContainsConditionSchema

# Variable: ListContainsConditionSchema

> `const` **ListContainsConditionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"list_contains"`\>; `listName`: `ZodString`; `value`: `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>; `negated`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}, \{ `type`: `"list_contains"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `negated?`: `boolean`; \}\>

Defined in: [types/schemas.ts:343](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L343)
