[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariationGroupSchema

# Variable: VariationGroupSchema

> `const` **VariationGroupSchema**: `ZodObject`\<\{ `id`: `ZodString`; `variants`: `ZodRecord`\<`ZodString`, `ZodObject`\<\{ `entryId`: `ZodString`; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `weight`: `ZodOptional`\<`ZodNumber`\>; `promptOverride`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}, \{ `id`: `string`; `variants`: `Record`\<`string`, \{ `entryId`: `string`; `tags?`: `string`[]; `weight?`: `number`; `promptOverride?`: `string`; \}\>; \}\>

Defined in: [types/schemas.ts:916](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L916)
