[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParallaxLayer

# Interface: ParallaxLayer

Defined in: [types/GameDefinition.ts:157](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L157)

Dual-field image reference for backwards compatibility.

Preferred: set `assetRef` to the asset UUID (R2 key derivation handled elsewhere).
Legacy: set `imageUrl` to a full URL or relative path.

During the migration window, callers may provide either (or both); runtime resolution
will decide precedence.

## Extends

- [`ImageField`](../type-aliases/ImageField.md)

## Properties

### imageUrl?

> `optional` **imageUrl**: `string`

Defined in: [types/GameDefinition.ts:20](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L20)

#### Inherited from

`ImageField.imageUrl`

***

### assetRef?

> `optional` **assetRef**: `string`

Defined in: [types/GameDefinition.ts:21](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L21)

#### Inherited from

`ImageField.assetRef`

***

### id

> **id**: `string`

Defined in: [types/GameDefinition.ts:158](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L158)

***

### name

> **name**: `string`

Defined in: [types/GameDefinition.ts:159](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L159)

***

### depth

> **depth**: [`ParallaxDepth`](../type-aliases/ParallaxDepth.md)

Defined in: [types/GameDefinition.ts:160](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L160)

***

### parallaxFactor

> **parallaxFactor**: `number`

Defined in: [types/GameDefinition.ts:161](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L161)

***

### scale?

> `optional` **scale**: `number`

Defined in: [types/GameDefinition.ts:162](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L162)

***

### offsetX?

> `optional` **offsetX**: `number`

Defined in: [types/GameDefinition.ts:163](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L163)

***

### offsetY?

> `optional` **offsetY**: `number`

Defined in: [types/GameDefinition.ts:164](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L164)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/GameDefinition.ts:165](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L165)
