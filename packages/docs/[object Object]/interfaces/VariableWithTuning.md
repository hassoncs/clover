[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableWithTuning

# Interface: VariableWithTuning

Defined in: [types/GameDefinition.ts:238](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L238)

Variable with tuning metadata for live editing

## Properties

### value

> **value**: [`GameVariableValue`](../type-aliases/GameVariableValue.md)

Defined in: [types/GameDefinition.ts:240](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L240)

Current/default value

***

### tuning?

> `optional` **tuning**: `object`

Defined in: [types/GameDefinition.ts:243](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L243)

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

Defined in: [types/GameDefinition.ts:250](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L250)

Category for grouping in UI (optional)

***

### label?

> `optional` **label**: `string`

Defined in: [types/GameDefinition.ts:253](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L253)

Human-readable label (optional)

***

### description?

> `optional` **description**: `string`

Defined in: [types/GameDefinition.ts:256](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L256)

Tooltip description (optional)

***

### display?

> `optional` **display**: `boolean`

Defined in: [types/GameDefinition.ts:259](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L259)

Show to player in HUD (optional)
