[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ModifyAction

# Interface: ModifyAction

Defined in: [types/rules.ts:262](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L262)

## Properties

### type

> **type**: `"modify"`

Defined in: [types/rules.ts:263](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L263)

***

### target

> **target**: \{ `type`: `"by_id"`; `entityId`: `string`; \} \| \{ `type`: `"by_tag"`; `tag`: `string`; \}

Defined in: [types/rules.ts:264](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L264)

***

### property

> **property**: `string`

Defined in: [types/rules.ts:265](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L265)

***

### operation

> **operation**: `"add"` \| `"set"` \| `"multiply"`

Defined in: [types/rules.ts:266](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L266)

***

### value

> **value**: `Value`\<`number`\>

Defined in: [types/rules.ts:267](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/rules.ts#L267)
