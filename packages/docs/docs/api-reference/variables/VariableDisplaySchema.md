[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableDisplaySchema

# Variable: VariableDisplaySchema

> `const` **VariableDisplaySchema**: `ZodObject`\<\{ `name`: `ZodString`; `label`: `ZodString`; `color`: `ZodOptional`\<`ZodString`\>; `format`: `ZodOptional`\<`ZodString`\>; `showWhen`: `ZodOptional`\<`ZodEnum`\<\[`"always"`, `"not_default"`\]\>\>; `defaultValue`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`, `ZodBoolean`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}\>

Defined in: [types/schemas.ts:549](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L549)
