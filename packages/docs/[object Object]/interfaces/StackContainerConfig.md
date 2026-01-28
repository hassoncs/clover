[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / StackContainerConfig

# Interface: StackContainerConfig

Defined in: [types/container.ts:18](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L18)

Stack container for vertical/horizontal stacking (Ball Sort tubes, card piles)

## Extends

- `BaseContainerConfig`

## Properties

### id

> **id**: `string`

Defined in: [types/container.ts:11](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L11)

#### Inherited from

`BaseContainerConfig.id`

***

### type

> **type**: `"stack"`

Defined in: [types/container.ts:19](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L19)

#### Overrides

`BaseContainerConfig.type`

***

### capacity

> **capacity**: `number`

Defined in: [types/container.ts:21](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L21)

Maximum number of items the container can hold

***

### layout

> **layout**: `object`

Defined in: [types/container.ts:22](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L22)

#### direction

> **direction**: `"horizontal"` \| `"vertical"`

Direction items are stacked

#### spacing

> **spacing**: `number`

Distance between items in world units

#### basePosition

> **basePosition**: [`Vec2`](Vec2.md)

Position of the first item (bottom/left)

#### anchor?

> `optional` **anchor**: `"left"` \| `"right"` \| `"top"` \| `"bottom"` \| `"center"`

Anchor point for positioning items within slots
