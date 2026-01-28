[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / selectVariantByIndex

# Function: selectVariantByIndex()

> **selectVariantByIndex**(`sheet`, `groupId`, `index`): \{ `entryId`: `string`; `region`: \{ `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}; \} \| `null`

Defined in: [types/asset-sheet.ts:255](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/asset-sheet.ts#L255)

Select a variant by index (for deterministic Match-3 mapping)
Uses group.order if available, else falls back to sorted keys

## Parameters

### sheet

[`AssetSheet`](../type-aliases/AssetSheet.md)

### groupId

`string`

### index

`number`

## Returns

\{ `entryId`: `string`; `region`: \{ `x`: `number`; `y`: `number`; `w`: `number`; `h`: `number`; \}; \} \| `null`
