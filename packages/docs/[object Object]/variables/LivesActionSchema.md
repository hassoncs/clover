[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LivesActionSchema

# Variable: LivesActionSchema

> `const` **LivesActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"lives"`\>; `operation`: `ZodEnum`\<\[`"add"`, `"subtract"`, `"set"`\]\>; `value`: `ZodUnion`\<\[`ZodNumber`, `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"lives"`; `operation`: `"add"` \| `"subtract"` \| `"set"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}, \{ `type`: `"lives"`; `operation`: `"add"` \| `"subtract"` \| `"set"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}\>

Defined in: [types/schemas.ts:386](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L386)
