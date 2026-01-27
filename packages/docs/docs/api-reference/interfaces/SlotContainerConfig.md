[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SlotContainerConfig

# Interface: SlotContainerConfig

Defined in: [types/container.ts:58](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L58)

Slot container for linear arrangements with named slots (choice tiles, inventory)

## Extends

- `BaseContainerConfig`

## Properties

### id

> **id**: `string`

Defined in: [types/container.ts:11](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L11)

#### Inherited from

`BaseContainerConfig.id`

***

### type

> **type**: `"slots"`

Defined in: [types/container.ts:59](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L59)

#### Overrides

`BaseContainerConfig.type`

***

### count

> **count**: `number`

Defined in: [types/container.ts:61](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L61)

Number of slots

***

### layout

> **layout**: `object`

Defined in: [types/container.ts:62](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L62)

#### direction

> **direction**: `"horizontal"` \| `"vertical"`

Direction slots are arranged

#### spacing

> **spacing**: `number`

Distance between slots in world units

#### basePosition

> **basePosition**: [`Vec2`](Vec2.md)

Position of the first slot

***

### allowEmpty?

> `optional` **allowEmpty**: `boolean`

Defined in: [types/container.ts:71](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L71)

Whether slots can be empty (false = always fill)
