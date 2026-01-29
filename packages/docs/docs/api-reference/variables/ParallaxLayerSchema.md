[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParallaxLayerSchema

# Variable: ParallaxLayerSchema

> `const` **ParallaxLayerSchema**: `ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `imageUrl`: `ZodOptional`\<`ZodString`\>; `assetRef`: `ZodOptional`\<`ZodString`\>; `depth`: `ZodEnum`\<\[`"sky"`, `"far"`, `"mid"`, `"near"`\]\>; `parallaxFactor`: `ZodNumber`; `scale`: `ZodOptional`\<`ZodNumber`\>; `offsetX`: `ZodOptional`\<`ZodNumber`\>; `offsetY`: `ZodOptional`\<`ZodNumber`\>; `visible`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `assetRef?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `assetRef?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}\>

Defined in: [types/schemas.ts:714](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L714)
