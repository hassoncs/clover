[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ApplyImpulseAction

# Interface: ApplyImpulseAction

Defined in: [types/rules.ts:284](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L284)

## Properties

### type

> **type**: `"apply_impulse"`

Defined in: [types/rules.ts:285](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L285)

***

### target

> **target**: [`EntityTarget`](../type-aliases/EntityTarget.md)

Defined in: [types/rules.ts:286](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L286)

***

### x?

> `optional` **x**: `Value`\<`number`\>

Defined in: [types/rules.ts:287](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L287)

***

### y?

> `optional` **y**: `Value`\<`number`\>

Defined in: [types/rules.ts:288](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L288)

***

### direction?

> `optional` **direction**: `"left"` \| `"right"` \| `"up"` \| `"down"` \| `"drag_direction"` \| `"tilt_direction"` \| `"toward_touch"`

Defined in: [types/rules.ts:289](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L289)

***

### force?

> `optional` **force**: `Value`\<`number`\>

Defined in: [types/rules.ts:290](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L290)

***

### sourceEntityId?

> `optional` **sourceEntityId**: `string`

Defined in: [types/rules.ts:292](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L292)

Source entity whose position is used for toward_touch direction calculation
