[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ContainerMatchRule

# Interface: ContainerMatchRule

Defined in: [types/container.ts:131](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L131)

Rule for validating if an item can be added to a container

## Properties

### tag?

> `optional` **tag**: `string`

Defined in: [types/container.ts:133](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L133)

Tag pattern the item must have (e.g., "color-*" matches "color-0", "color-1")

***

### excludeTag?

> `optional` **excludeTag**: `string`

Defined in: [types/container.ts:135](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L135)

Tag pattern the top item must NOT have (for negative matching)

***

### property?

> `optional` **property**: `string`

Defined in: [types/container.ts:137](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L137)

Property value that must match the top item

***

### expr?

> `optional` **expr**: `string`

Defined in: [types/container.ts:139](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L139)

Expression for custom validation

***

### allowEmpty?

> `optional` **allowEmpty**: `boolean`

Defined in: [types/container.ts:141](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/container.ts#L141)

Empty containers always accept (default: true)
