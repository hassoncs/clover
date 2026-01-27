[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ModifyAction

# Interface: ModifyAction

Defined in: [types/rules.ts:270](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L270)

## Properties

### type

> **type**: `"modify"`

Defined in: [types/rules.ts:271](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L271)

***

### target

> **target**: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; \}

Defined in: [types/rules.ts:272](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L272)

***

### property

> **property**: `string`

Defined in: [types/rules.ts:273](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L273)

***

### operation

> **operation**: `"add"` \| `"set"` \| `"multiply"`

Defined in: [types/rules.ts:274](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L274)

***

### value

> **value**: `Value`\<`number`\>

Defined in: [types/rules.ts:275](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/rules.ts#L275)
