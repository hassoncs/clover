[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ApplyImpulseAction

# Interface: ApplyImpulseAction

Defined in: [types/rules.ts:292](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L292)

## Properties

### type

> **type**: `"apply_impulse"`

Defined in: [types/rules.ts:293](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L293)

***

### target

> **target**: [`EntityTarget`](../type-aliases/EntityTarget.md)

Defined in: [types/rules.ts:294](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L294)

***

### x?

> `optional` **x**: `Value`\<`number`\>

Defined in: [types/rules.ts:295](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L295)

***

### y?

> `optional` **y**: `Value`\<`number`\>

Defined in: [types/rules.ts:296](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L296)

***

### direction?

> `optional` **direction**: `"left"` \| `"right"` \| `"up"` \| `"down"` \| `"drag_direction"` \| `"tilt_direction"` \| `"toward_touch"`

Defined in: [types/rules.ts:297](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L297)

***

### force?

> `optional` **force**: `Value`\<`number`\>

Defined in: [types/rules.ts:298](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L298)

***

### sourceEntityId?

> `optional` **sourceEntityId**: `string`

Defined in: [types/rules.ts:300](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L300)

Source entity whose position is used for toward_touch direction calculation
