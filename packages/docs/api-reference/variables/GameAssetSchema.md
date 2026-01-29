[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameAssetSchema

# Variable: GameAssetSchema

> `const` **GameAssetSchema**: `ZodObject`\<\{ `id`: `ZodString`; `ownerGameId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\[`"generated"`, `"uploaded"`, `"none"`\]\>; `imageUrl`: `ZodString`; `width`: `ZodOptional`\<`ZodNumber`\>; `height`: `ZodOptional`\<`ZodNumber`\>; `contentHash`: `ZodOptional`\<`ZodString`\>; `createdAt`: `ZodNumber`; `deletedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `ownerGameId?`: `string`; `source`: `"none"` \| `"generated"` \| `"uploaded"`; `imageUrl`: `string`; `width?`: `number`; `height?`: `number`; `contentHash?`: `string`; `createdAt`: `number`; `deletedAt?`: `number`; \}, \{ `id`: `string`; `ownerGameId?`: `string`; `source`: `"none"` \| `"generated"` \| `"uploaded"`; `imageUrl`: `string`; `width?`: `number`; `height?`: `number`; `contentHash?`: `string`; `createdAt`: `number`; `deletedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:166](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/asset-system.ts#L166)
