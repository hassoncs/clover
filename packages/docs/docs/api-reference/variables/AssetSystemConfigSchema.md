[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetSystemConfigSchema

# Variable: AssetSystemConfigSchema

> `const` **AssetSystemConfigSchema**: `ZodObject`\<\{ `activeAssetPackId`: `ZodOptional`\<`ZodString`\>; `entityAssetOverrides`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodObject`\<\{ `assetId`: `ZodString`; `placement`: `ZodOptional`\<`ZodObject`\<\{ `scale`: `ZodNumber`; `offsetX`: `ZodNumber`; `offsetY`: `ZodNumber`; `anchor`: `ZodOptional`\<`ZodObject`\<..., ..., ..., ..., ...\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: ...; `y`: ...; \}; \}, \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: ...; `y`: ...; \}; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; \}, \{ `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; \}\>\>\>; `baseAssetUrl`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `activeAssetPackId?`: `string`; `entityAssetOverrides?`: `Record`\<`string`, \{ `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; \}\>; `baseAssetUrl?`: `string`; \}, \{ `activeAssetPackId?`: `string`; `entityAssetOverrides?`: `Record`\<`string`, \{ `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; \}\>; `baseAssetUrl?`: `string`; \}\>

Defined in: [types/asset-system.ts:226](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/asset-system.ts#L226)
