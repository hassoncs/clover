[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameDefinition

# Interface: GameDefinition

Defined in: [types/GameDefinition.ts:333](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L333)

## Properties

### metadata

> **metadata**: [`GameMetadata`](GameMetadata.md)

Defined in: [types/GameDefinition.ts:334](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L334)

***

### world

> **world**: [`WorldConfig`](WorldConfig.md)

Defined in: [types/GameDefinition.ts:335](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L335)

***

### presentation?

> `optional` **presentation**: [`PresentationConfig`](PresentationConfig.md)

Defined in: [types/GameDefinition.ts:336](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L336)

***

### camera?

> `optional` **camera**: [`CameraConfig`](CameraConfig.md)

Defined in: [types/GameDefinition.ts:337](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L337)

***

### ui?

> `optional` **ui**: [`UIConfig`](UIConfig.md)

Defined in: [types/GameDefinition.ts:338](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L338)

***

### background?

> `optional` **background**: [`BackgroundConfig`](../type-aliases/BackgroundConfig.md)

Defined in: [types/GameDefinition.ts:339](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L339)

***

### variables?

> `optional` **variables**: `Record`\<`string`, [`GameVariableValue`](../type-aliases/GameVariableValue.md)\>

Defined in: [types/GameDefinition.ts:340](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L340)

***

### templates

> **templates**: `Record`\<`string`, [`EntityTemplate`](EntityTemplate.md)\>

Defined in: [types/GameDefinition.ts:341](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L341)

***

### entities

> **entities**: [`GameEntity`](GameEntity.md)[]

Defined in: [types/GameDefinition.ts:342](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L342)

***

### joints?

> `optional` **joints**: [`GameJoint`](../type-aliases/GameJoint.md)[]

Defined in: [types/GameDefinition.ts:343](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L343)

***

### rules?

> `optional` **rules**: [`GameRule`](GameRule.md)[]

Defined in: [types/GameDefinition.ts:344](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L344)

***

### winCondition?

> `optional` **winCondition**: [`WinCondition`](WinCondition.md)

Defined in: [types/GameDefinition.ts:345](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L345)

***

### loseCondition?

> `optional` **loseCondition**: [`LoseCondition`](LoseCondition.md)

Defined in: [types/GameDefinition.ts:346](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L346)

***

### initialLives?

> `optional` **initialLives**: `number`

Defined in: [types/GameDefinition.ts:347](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L347)

***

### initialScore?

> `optional` **initialScore**: `number`

Defined in: [types/GameDefinition.ts:348](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L348)

***

### assetPacks?

> `optional` **assetPacks**: `Record`\<`string`, [`AssetPack`](AssetPack.md)\>

Defined in: [types/GameDefinition.ts:349](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L349)

***

### activeAssetPackId?

> `optional` **activeAssetPackId**: `string`

Defined in: [types/GameDefinition.ts:350](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L350)

***

### assetSystem?

> `optional` **assetSystem**: [`AssetSystemConfig`](AssetSystemConfig.md)

Defined in: [types/GameDefinition.ts:351](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L351)

***

### ~~parallaxConfig?~~

> `optional` **parallaxConfig**: [`ParallaxConfig`](ParallaxConfig.md)

Defined in: [types/GameDefinition.ts:353](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L353)

#### Deprecated

Use background with type: 'parallax' instead

***

### tileSheets?

> `optional` **tileSheets**: [`TileSheet`](TileSheet.md)[]

Defined in: [types/GameDefinition.ts:354](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L354)

***

### tileMaps?

> `optional` **tileMaps**: [`TileMap`](TileMap.md)[]

Defined in: [types/GameDefinition.ts:355](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L355)

***

### multiplayer?

> `optional` **multiplayer**: [`MultiplayerConfig`](MultiplayerConfig.md)

Defined in: [types/GameDefinition.ts:356](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L356)

***

### loadingScreen?

> `optional` **loadingScreen**: [`LoadingScreenConfig`](LoadingScreenConfig.md)

Defined in: [types/GameDefinition.ts:357](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L357)

***

### sounds?

> `optional` **sounds**: `Record`\<`string`, [`SoundAsset`](SoundAsset.md)\>

Defined in: [types/GameDefinition.ts:358](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L358)

***

### input?

> `optional` **input**: [`InputConfig`](InputConfig.md)

Defined in: [types/GameDefinition.ts:359](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L359)

***

### match3?

> `optional` **match3**: [`Match3Config`](Match3Config.md)

Defined in: [types/GameDefinition.ts:360](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L360)

***

### tetris?

> `optional` **tetris**: [`TetrisConfig`](TetrisConfig.md)

Defined in: [types/GameDefinition.ts:361](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L361)

***

### stateMachines?

> `optional` **stateMachines**: `StateMachineDefinition`[]

Defined in: [types/GameDefinition.ts:366](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/GameDefinition.ts#L366)

Game-level state machines for managing game phases, turns, and flow.
Unlike entity-level machines, these have no `owner` field set.
