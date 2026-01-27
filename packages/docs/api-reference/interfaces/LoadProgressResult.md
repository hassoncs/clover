[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LoadProgressResult

# Interface: LoadProgressResult\<T\>

Defined in: types/progress.ts:109

Result of loading progress from storage.

## Type Parameters

### T

`T`

## Properties

### success

> **success**: `boolean`

Defined in: types/progress.ts:111

Whether the load was successful

***

### data

> **data**: `T`

Defined in: types/progress.ts:114

The loaded progress data (or defaults on failure)

***

### migrated

> **migrated**: `boolean`

Defined in: types/progress.ts:117

Whether data was migrated during load

***

### errors?

> `optional` **errors**: `string`[]

Defined in: types/progress.ts:120

Error messages if load failed
