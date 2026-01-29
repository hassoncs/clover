[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetPackEntrySchema

# Variable: AssetPackEntrySchema

> `const` **AssetPackEntrySchema**: `ZodObject`\<\{ `id`: `ZodString`; `packId`: `ZodString`; `templateId`: `ZodString`; `assetId`: `ZodString`; `placement`: `ZodOptional`\<`ZodObject`\<\{ `scale`: `ZodNumber`; `offsetX`: `ZodNumber`; `offsetY`: `ZodNumber`; `anchor`: `ZodOptional`\<`ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}, \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}\>\>; `lastGeneration`: `ZodOptional`\<`ZodObject`\<\{ `jobId`: `ZodString`; `taskId`: `ZodString`; `compiledPrompt`: `ZodString`; `createdAt`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `jobId`: `string`; `taskId`: `string`; `compiledPrompt`: `string`; `createdAt`: `number`; \}, \{ `jobId`: `string`; `taskId`: `string`; `compiledPrompt`: `string`; `createdAt`: `number`; \}\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `packId`: `string`; `templateId`: `string`; `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; `lastGeneration?`: \{ `jobId`: `string`; `taskId`: `string`; `compiledPrompt`: `string`; `createdAt`: `number`; \}; \}, \{ `id`: `string`; `packId`: `string`; `templateId`: `string`; `assetId`: `string`; `placement?`: \{ `scale`: `number`; `offsetX`: `number`; `offsetY`: `number`; `anchor?`: \{ `x`: `number`; `y`: `number`; \}; \}; `lastGeneration?`: \{ `jobId`: `string`; `taskId`: `string`; `compiledPrompt`: `string`; `createdAt`: `number`; \}; \}\>

Defined in: [types/asset-system.ts:185](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/asset-system.ts#L185)
