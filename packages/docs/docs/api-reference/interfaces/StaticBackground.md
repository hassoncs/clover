[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / StaticBackground

# Interface: StaticBackground

Defined in: [types/GameDefinition.ts:173](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L173)

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

### type

> **type**: `"static"`

Defined in: [types/GameDefinition.ts:174](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L174)

***

### color?

> `optional` **color**: `string`

Defined in: [types/GameDefinition.ts:175](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L175)
