[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PushToListActionSchema

# Variable: PushToListActionSchema

> `const` **PushToListActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"push_to_list"`\>; `listName`: `ZodString`; `value`: `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"push_to_list"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}, \{ `type`: `"push_to_list"`; `listName`: `string`; `value`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}\>

Defined in: [types/schemas.ts:443](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L443)
