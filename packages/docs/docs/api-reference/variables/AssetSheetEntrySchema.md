[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetSheetEntrySchema

# Variable: AssetSheetEntrySchema

> `const` **AssetSheetEntrySchema**: `ZodObject`\<\{ `id`: `ZodString`; `region`: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"gridIndex"`\>; `index`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"gridIndex"`; `index`: `number`; \}, \{ `type`: `"gridIndex"`; `index`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"rect"`\>; `x`: `ZodNumber`; `y`: `ZodNumber`; `w`: `ZodNumber`; `h`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}\>\]\>; `pivot`: `ZodOptional`\<`ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>\>; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `promptOverride`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `region`: \{ `type`: `"gridIndex"`; `index`: `number`; \} \| \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}; `pivot?`: \{ `x`: `number`; `y`: `number`; \}; `tags?`: `string`[]; `promptOverride?`: `string`; \}, \{ `id`: `string`; `region`: \{ `type`: `"gridIndex"`; `index`: `number`; \} \| \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}; `pivot?`: \{ `x`: `number`; `y`: `number`; \}; `tags?`: `string`[]; `promptOverride?`: `string`; \}\>

Defined in: [types/schemas.ts:858](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L858)
