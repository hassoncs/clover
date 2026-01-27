[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableWithTuning

# Interface: VariableWithTuning

Defined in: [types/GameDefinition.ts:221](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L221)

Variable with tuning metadata for live editing

## Properties

### value

> **value**: [`GameVariableValue`](../type-aliases/GameVariableValue.md)

Defined in: [types/GameDefinition.ts:223](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L223)

Current/default value

***

### tuning?

> `optional` **tuning**: `object`

Defined in: [types/GameDefinition.ts:226](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L226)

Tuning configuration for dev UI (optional)

#### min

> **min**: `number`

#### max

> **max**: `number`

#### step

> **step**: `number`

***

### category?

> `optional` **category**: `"physics"` \| `"gameplay"` \| `"visuals"` \| `"economy"` \| `"ai"`

Defined in: [types/GameDefinition.ts:233](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L233)

Category for grouping in UI (optional)

***

### label?

> `optional` **label**: `string`

Defined in: [types/GameDefinition.ts:236](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L236)

Human-readable label (optional)

***

### description?

> `optional` **description**: `string`

Defined in: [types/GameDefinition.ts:239](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L239)

Tooltip description (optional)

***

### display?

> `optional` **display**: `boolean`

Defined in: [types/GameDefinition.ts:242](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L242)

Show to player in HUD (optional)
