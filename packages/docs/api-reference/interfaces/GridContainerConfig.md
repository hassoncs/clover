[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GridContainerConfig

# Interface: GridContainerConfig

Defined in: [types/container.ts:37](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L37)

Grid container for 2D arrangements (Gem Crush, Connect4 board)

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

> **type**: `"grid"`

Defined in: [types/container.ts:38](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L38)

#### Overrides

`BaseContainerConfig.type`

***

### rows

> **rows**: `number`

Defined in: [types/container.ts:40](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L40)

Number of rows

***

### cols

> **cols**: `number`

Defined in: [types/container.ts:42](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L42)

Number of columns

***

### cellSize

> **cellSize**: `number`

Defined in: [types/container.ts:44](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L44)

Size of each cell in world units

***

### origin

> **origin**: [`Vec2`](Vec2.md)

Defined in: [types/container.ts:46](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L46)

Position of the grid origin

***

### originAnchor?

> `optional` **originAnchor**: `"top-left"` \| `"top-right"` \| `"center"` \| `"bottom-left"` \| `"bottom-right"`

Defined in: [types/container.ts:48](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L48)

Which corner the origin is at

***

### matchTagPattern?

> `optional` **matchTagPattern**: `string`

Defined in: [types/container.ts:50](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L50)

Optional tag pattern for match detection (e.g., "color-*" or "gem_*")

***

### minMatch?

> `optional` **minMatch**: `number`

Defined in: [types/container.ts:52](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/container.ts#L52)

Minimum match length for match detection
