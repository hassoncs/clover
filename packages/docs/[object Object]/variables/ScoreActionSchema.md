[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ScoreActionSchema

# Variable: ScoreActionSchema

> `const` **ScoreActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"score"`\>; `operation`: `ZodEnum`\<\[`"add"`, `"subtract"`, `"set"`, `"multiply"`\]\>; `value`: `ZodUnion`\<\[`ZodNumber`, `ZodObject`\<\{ `expr`: `ZodString`; `debugName`: `ZodOptional`\<`ZodString`\>; `cache`: `ZodOptional`\<`ZodEnum`\<\[`"none"`, `"frame"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}, \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}\>\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"score"`; `operation`: `"add"` \| `"subtract"` \| `"set"` \| `"multiply"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}, \{ `type`: `"score"`; `operation`: `"add"` \| `"subtract"` \| `"set"` \| `"multiply"`; `value`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; \}\>

Defined in: [types/schemas.ts:402](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L402)
