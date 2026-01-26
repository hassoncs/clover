[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SheetRegionSchema

# Variable: SheetRegionSchema

> `const` **SheetRegionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"gridIndex"`\>; `index`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"gridIndex"`; `index`: `number`; \}, \{ `type`: `"gridIndex"`; `index`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"rect"`\>; `x`: `ZodNumber`; `y`: `ZodNumber`; `w`: `ZodNumber`; `h`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}, \{ `type`: `"rect"`; `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}\>\]\>

Defined in: [types/schemas.ts:723](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L723)
