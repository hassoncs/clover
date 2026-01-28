[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ApplyImpulseAction

# Interface: ApplyImpulseAction

Defined in: [types/rules.ts:325](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L325)

## Properties

### type

> **type**: `"apply_impulse"`

Defined in: [types/rules.ts:326](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L326)

***

### target

> **target**: [`EntityTarget`](../type-aliases/EntityTarget.md)

Defined in: [types/rules.ts:327](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L327)

***

### x?

> `optional` **x**: `Value`\<`number`\>

Defined in: [types/rules.ts:328](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L328)

***

### y?

> `optional` **y**: `Value`\<`number`\>

Defined in: [types/rules.ts:329](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L329)

***

### direction?

> `optional` **direction**: `"left"` \| `"right"` \| `"up"` \| `"down"` \| `"toward_touch"` \| `"drag_direction"` \| `"tilt_direction"`

Defined in: [types/rules.ts:330](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L330)

***

### force?

> `optional` **force**: `Value`\<`number`\>

Defined in: [types/rules.ts:331](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L331)

***

### sourceEntityId?

> `optional` **sourceEntityId**: `string`

Defined in: [types/rules.ts:333](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/rules.ts#L333)

Source entity whose position is used for toward_touch direction calculation
