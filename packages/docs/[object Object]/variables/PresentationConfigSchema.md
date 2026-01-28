[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PresentationConfigSchema

# Variable: PresentationConfigSchema

> `const` **PresentationConfigSchema**: `ZodObject`\<\{ `aspectRatio`: `ZodOptional`\<`ZodUnion`\<\[`ZodObject`\<\{ `width`: `ZodNumber`; `height`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `width`: `number`; `height`: `number`; \}, \{ `width`: `number`; `height`: `number`; \}\>, `ZodNumber`\]\>\>; `fit`: `ZodOptional`\<`ZodEnum`\<\[`"contain"`, `"cover"`\]\>\>; `letterboxColor`: `ZodOptional`\<`ZodString`\>; `orientation`: `ZodOptional`\<`ZodEnum`\<\[`"portrait"`, `"landscape"`, `"any"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}\>

Defined in: [types/schemas.ts:636](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L636)
