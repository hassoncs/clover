[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParallaxConfigSchema

# Variable: ParallaxConfigSchema

> `const` **ParallaxConfigSchema**: `ZodObject`\<\{ `enabled`: `ZodBoolean`; `layers`: `ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `imageUrl`: `ZodOptional`\<`ZodString`\>; `depth`: `ZodEnum`\<\[`"sky"`, `"far"`, `"mid"`, `"near"`\]\>; `parallaxFactor`: `ZodNumber`; `scale`: `ZodOptional`\<`ZodNumber`\>; `offsetX`: `ZodOptional`\<`ZodNumber`\>; `offsetY`: `ZodOptional`\<`ZodNumber`\>; `visible`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `enabled`: `boolean`; `layers`: `object`[]; \}, \{ `enabled`: `boolean`; `layers`: `object`[]; \}\>

Defined in: [types/schemas.ts:618](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L618)
