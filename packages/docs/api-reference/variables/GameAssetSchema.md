[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameAssetSchema

# Variable: GameAssetSchema

> `const` **GameAssetSchema**: `ZodObject`\<\{ `id`: `ZodString`; `ownerGameId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\[`"generated"`, `"uploaded"`, `"none"`\]\>; `imageUrl`: `ZodString`; `width`: `ZodOptional`\<`ZodNumber`\>; `height`: `ZodOptional`\<`ZodNumber`\>; `contentHash`: `ZodOptional`\<`ZodString`\>; `createdAt`: `ZodNumber`; `deletedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `ownerGameId?`: `string`; `source`: `"none"` \| `"generated"` \| `"uploaded"`; `imageUrl`: `string`; `width?`: `number`; `height?`: `number`; `contentHash?`: `string`; `createdAt`: `number`; `deletedAt?`: `number`; \}, \{ `id`: `string`; `ownerGameId?`: `string`; `source`: `"none"` \| `"generated"` \| `"uploaded"`; `imageUrl`: `string`; `width?`: `number`; `height?`: `number`; `contentHash?`: `string`; `createdAt`: `number`; `deletedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:150](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/asset-system.ts#L150)
