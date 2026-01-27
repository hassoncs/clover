[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableDisplaySchema

# Variable: VariableDisplaySchema

> `const` **VariableDisplaySchema**: `ZodObject`\<\{ `name`: `ZodString`; `label`: `ZodString`; `color`: `ZodOptional`\<`ZodString`\>; `format`: `ZodOptional`\<`ZodString`\>; `showWhen`: `ZodOptional`\<`ZodEnum`\<\[`"always"`, `"not_default"`\]\>\>; `defaultValue`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`, `ZodBoolean`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}\>

Defined in: [types/schemas.ts:585](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L585)
