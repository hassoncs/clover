[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ZoneShapeSchema

# Variable: ZoneShapeSchema

> `const` **ZoneShapeSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"box"`\>; `width`: `ZodNumber`; `height`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"box"`; `width`: `number`; `height`: `number`; \}, \{ `type`: `"box"`; `width`: `number`; `height`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"circle"`\>; `radius`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"circle"`; `radius`: `number`; \}, \{ `type`: `"circle"`; `radius`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"polygon"`\>; `vertices`: `ZodArray`\<`ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"polygon"`; `vertices`: `object`[]; \}, \{ `type`: `"polygon"`; `vertices`: `object`[]; \}\>\]\>

Defined in: [types/schemas.ts:111](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L111)
