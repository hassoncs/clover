[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariationGroupSchema

# Variable: VariationGroupSchema

> `const` **VariationGroupSchema**: `ZodObject`\<\{ `id`: `ZodString`; `variants`: `ZodRecord`\<`ZodString`, `ZodObject`\<\{ `entryId`: `ZodString`; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `weight`: `ZodOptional`\<`ZodNumber`\>; `promptOverride`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}\>

Defined in: [types/schemas.ts:843](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/schemas.ts#L843)
