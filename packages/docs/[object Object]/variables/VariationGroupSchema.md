[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariationGroupSchema

# Variable: VariationGroupSchema

> `const` **VariationGroupSchema**: `ZodObject`\<\{ `id`: `ZodString`; `variants`: `ZodRecord`\<`ZodString`, `ZodObject`\<\{ `entryId`: `ZodString`; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `weight`: `ZodOptional`\<`ZodNumber`\>; `promptOverride`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}\>

Defined in: [types/schemas.ts:807](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L807)
