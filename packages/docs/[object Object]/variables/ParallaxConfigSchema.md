[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParallaxConfigSchema

# Variable: ParallaxConfigSchema

> `const` **ParallaxConfigSchema**: `ZodObject`\<\{ `enabled`: `ZodBoolean`; `layers`: `ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `imageUrl`: `ZodOptional`\<`ZodString`\>; `assetRef`: `ZodOptional`\<`ZodString`\>; `depth`: `ZodEnum`\<\[`"sky"`, `"far"`, `"mid"`, `"near"`\]\>; `parallaxFactor`: `ZodNumber`; `scale`: `ZodOptional`\<`ZodNumber`\>; `offsetX`: `ZodOptional`\<`ZodNumber`\>; `offsetY`: `ZodOptional`\<`ZodNumber`\>; `visible`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `assetRef?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}, \{ `id`: `string`; `name`: `string`; `imageUrl?`: `string`; `assetRef?`: `string`; `depth`: `"sky"` \| `"far"` \| `"mid"` \| `"near"`; `parallaxFactor`: `number`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `visible?`: `boolean`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `enabled`: `boolean`; `layers`: `object`[]; \}, \{ `enabled`: `boolean`; `layers`: `object`[]; \}\>

Defined in: [types/schemas.ts:727](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L727)
