[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SheetRegionSchema

# Variable: SheetRegionSchema

> `const` **SheetRegionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"gridIndex"`\>; `index`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"gridIndex"`; `index`: `number`; \}, \{ `type`: `"gridIndex"`; `index`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"rect"`\>; `x`: `ZodNumber`; `y`: `ZodNumber`; `w`: `ZodNumber`; `h`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}\>\]\>

Defined in: [types/schemas.ts:759](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L759)
