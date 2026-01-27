[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParallaxLayerSchema

# Variable: ParallaxLayerSchema

> `const` **ParallaxLayerSchema**: `ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `imageUrl`: `ZodOptional`\<`ZodString`\>; `depth`: `ZodEnum`\<\[`"sky"`, `"far"`, `"mid"`, `"near"`\]\>; `parallaxFactor`: `ZodNumber`; `scale`: `ZodOptional`\<`ZodNumber`\>; `offsetX`: `ZodOptional`\<`ZodNumber`\>; `offsetY`: `ZodOptional`\<`ZodNumber`\>; `visible`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}\>

Defined in: [types/schemas.ts:642](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L642)
