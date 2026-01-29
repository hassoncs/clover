[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LoadProgressResult

# Interface: LoadProgressResult\<T\>

Defined in: [types/progress.ts:109](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L109)

Result of loading progress from storage.

## Type Parameters

### T

`T`

## Properties

### success

> **success**: `boolean`

Defined in: [types/progress.ts:111](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L111)

Whether the load was successful

***

### data

> **data**: `T`

Defined in: [types/progress.ts:114](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L114)

The loaded progress data (or defaults on failure)

***

### migrated

> **migrated**: `boolean`

Defined in: [types/progress.ts:117](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L117)

Whether data was migrated during load

***

### errors?

> `optional` **errors**: `string`[]

Defined in: [types/progress.ts:120](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L120)

Error messages if load failed
