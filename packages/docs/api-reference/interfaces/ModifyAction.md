[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ModifyAction

# Interface: ModifyAction

Defined in: [types/rules.ts:303](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L303)

## Properties

### type

> **type**: `"modify"`

Defined in: [types/rules.ts:304](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L304)

***

### target

> **target**: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; \}

Defined in: [types/rules.ts:305](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L305)

***

### property

> **property**: `string`

Defined in: [types/rules.ts:306](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L306)

***

### operation

> **operation**: `"add"` \| `"set"` \| `"multiply"`

Defined in: [types/rules.ts:307](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L307)

***

### value

> **value**: `Value`\<`number`\>

Defined in: [types/rules.ts:308](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/rules.ts#L308)
