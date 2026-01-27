[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SheetLayoutSchema

# Variable: SheetLayoutSchema

> `const` **SheetLayoutSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"grid"`\>; `columns`: `ZodNumber`; `rows`: `ZodNumber`; `cellWidth`: `ZodNumber`; `cellHeight`: `ZodNumber`; `spacing`: `ZodOptional`\<`ZodNumber`\>; `margin`: `ZodOptional`\<`ZodNumber`\>; `origin`: `ZodOptional`\<`ZodLiteral`\<`"top-left"`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"grid"`; `columns`: `number`; `rows`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; `origin?`: `"top-left"`; \}, \{ `type`: `"grid"`; `columns`: `number`; `rows`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; `origin?`: `"top-left"`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"strip"`\>; `direction`: `ZodEnum`\<\[`"horizontal"`, `"vertical"`\]\>; `frameCount`: `ZodNumber`; `cellWidth`: `ZodNumber`; `cellHeight`: `ZodNumber`; `spacing`: `ZodOptional`\<`ZodNumber`\>; `margin`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"strip"`; `direction`: `"horizontal"` \| `"vertical"`; `frameCount`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; \}, \{ `type`: `"strip"`; `direction`: `"horizontal"` \| `"vertical"`; `frameCount`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"manual"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"manual"`; \}, \{ `type`: `"manual"`; \}\>\]\>

Defined in: [types/schemas.ts:734](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/schemas.ts#L734)
