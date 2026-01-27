[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableWithTuning

# Interface: VariableWithTuning

Defined in: [types/GameDefinition.ts:220](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L220)

Variable with tuning metadata for live editing

## Properties

### value

> **value**: [`GameVariableValue`](../type-aliases/GameVariableValue.md)

Defined in: [types/GameDefinition.ts:222](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L222)

Current/default value

***

### tuning?

> `optional` **tuning**: `object`

Defined in: [types/GameDefinition.ts:225](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L225)

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

Defined in: [types/GameDefinition.ts:232](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L232)

Category for grouping in UI (optional)

***

### label?

> `optional` **label**: `string`

Defined in: [types/GameDefinition.ts:235](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L235)

Human-readable label (optional)

***

### description?

> `optional` **description**: `string`

Defined in: [types/GameDefinition.ts:238](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L238)

Tooltip description (optional)

***

### display?

> `optional` **display**: `boolean`

Defined in: [types/GameDefinition.ts:241](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L241)

Show to player in HUD (optional)
