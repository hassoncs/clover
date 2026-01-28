[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / RuleTriggerSchema

# Variable: RuleTriggerSchema

> `const` **RuleTriggerSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"collision"`\>; `entityATag`: `ZodString`; `entityBTag`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"collision"`; `entityATag`: `string`; `entityBTag`: `string`; \}, \{ `type`: `"collision"`; `entityATag`: `string`; `entityBTag`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"zone_enter"`\>; `zoneTag`: `ZodString`; `entityTag`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"zone_enter"`; `zoneTag`: `string`; `entityTag`: `string`; \}, \{ `type`: `"zone_enter"`; `zoneTag`: `string`; `entityTag`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"zone_exit"`\>; `zoneTag`: `ZodString`; `entityTag`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"zone_exit"`; `zoneTag`: `string`; `entityTag`: `string`; \}, \{ `type`: `"zone_exit"`; `zoneTag`: `string`; `entityTag`: `string`; \}\>\]\>

Defined in: [types/schemas.ts:302](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L302)
