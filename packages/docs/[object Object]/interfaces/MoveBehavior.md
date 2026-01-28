[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / MoveBehavior

# Interface: MoveBehavior

Defined in: [types/behavior.ts:49](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L49)

## Extends

- `BaseBehavior`

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/behavior.ts:46](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L46)

#### Inherited from

`BaseBehavior.enabled`

***

### type

> **type**: `"move"`

Defined in: [types/behavior.ts:50](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L50)

#### Overrides

`BaseBehavior.type`

***

### direction

> **direction**: [`MoveDirection`](../type-aliases/MoveDirection.md)

Defined in: [types/behavior.ts:51](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L51)

***

### speed

> **speed**: `number`

Defined in: [types/behavior.ts:52](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L52)

***

### target?

> `optional` **target**: `string`

Defined in: [types/behavior.ts:53](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L53)

***

### movementType?

> `optional` **movementType**: `"velocity"` \| `"force"`

Defined in: [types/behavior.ts:54](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L54)

***

### patrol?

> `optional` **patrol**: [`Bounds`](Bounds.md)

Defined in: [types/behavior.ts:55](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L55)
