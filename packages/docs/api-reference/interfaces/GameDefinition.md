[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameDefinition

# Interface: GameDefinition

Defined in: [types/GameDefinition.ts:466](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L466)

## Properties

### metadata

> **metadata**: [`GameMetadata`](GameMetadata.md)

Defined in: [types/GameDefinition.ts:467](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L467)

***

### world

> **world**: [`WorldConfig`](WorldConfig.md)

Defined in: [types/GameDefinition.ts:468](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L468)

***

### presentation?

> `optional` **presentation**: [`PresentationConfig`](PresentationConfig.md)

Defined in: [types/GameDefinition.ts:469](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L469)

***

### camera?

> `optional` **camera**: [`CameraConfig`](CameraConfig.md)

Defined in: [types/GameDefinition.ts:470](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L470)

***

### ui?

> `optional` **ui**: [`UIConfig`](UIConfig.md)

Defined in: [types/GameDefinition.ts:471](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L471)

***

### background?

> `optional` **background**: [`BackgroundConfig`](../type-aliases/BackgroundConfig.md)

Defined in: [types/GameDefinition.ts:472](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L472)

***

### variables?

> `optional` **variables**: `Record`\<`string`, [`GameVariable`](../type-aliases/GameVariable.md)\>

Defined in: [types/GameDefinition.ts:473](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L473)

***

### templates

> **templates**: `Record`\<`string`, [`EntityTemplate`](../type-aliases/EntityTemplate.md)\>

Defined in: [types/GameDefinition.ts:474](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L474)

***

### entities

> **entities**: [`GameEntity`](GameEntity.md)[]

Defined in: [types/GameDefinition.ts:475](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L475)

***

### joints?

> `optional` **joints**: [`GameJoint`](../type-aliases/GameJoint.md)[]

Defined in: [types/GameDefinition.ts:476](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L476)

***

### rules?

> `optional` **rules**: [`GameRule`](GameRule.md)[]

Defined in: [types/GameDefinition.ts:477](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L477)

***

### winCondition?

> `optional` **winCondition**: [`WinCondition`](WinCondition.md)

Defined in: [types/GameDefinition.ts:478](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L478)

***

### loseCondition?

> `optional` **loseCondition**: [`LoseCondition`](LoseCondition.md)

Defined in: [types/GameDefinition.ts:479](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L479)

***

### initialLives?

> `optional` **initialLives**: `number`

Defined in: [types/GameDefinition.ts:480](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L480)

***

### initialScore?

> `optional` **initialScore**: `number`

Defined in: [types/GameDefinition.ts:481](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L481)

***

### assetPacks?

> `optional` **assetPacks**: `Record`\<`string`, [`AssetPack`](AssetPack.md)\>

Defined in: [types/GameDefinition.ts:482](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L482)

***

### activeAssetPackId?

> `optional` **activeAssetPackId**: `string`

Defined in: [types/GameDefinition.ts:483](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L483)

***

### assetSystem?

> `optional` **assetSystem**: [`AssetSystemConfig`](AssetSystemConfig.md)

Defined in: [types/GameDefinition.ts:484](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L484)

***

### ~~parallaxConfig?~~

> `optional` **parallaxConfig**: [`ParallaxConfig`](ParallaxConfig.md)

Defined in: [types/GameDefinition.ts:486](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L486)

#### Deprecated

Use background with type: 'parallax' instead

***

### tileSheets?

> `optional` **tileSheets**: [`TileSheet`](TileSheet.md)[]

Defined in: [types/GameDefinition.ts:487](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L487)

***

### tileMaps?

> `optional` **tileMaps**: [`TileMap`](TileMap.md)[]

Defined in: [types/GameDefinition.ts:488](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L488)

***

### multiplayer?

> `optional` **multiplayer**: [`MultiplayerConfig`](MultiplayerConfig.md)

Defined in: [types/GameDefinition.ts:489](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L489)

***

### loadingScreen?

> `optional` **loadingScreen**: [`LoadingScreenConfig`](LoadingScreenConfig.md)

Defined in: [types/GameDefinition.ts:490](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L490)

***

### sounds?

> `optional` **sounds**: `Record`\<`string`, [`SoundAsset`](SoundAsset.md)\>

Defined in: [types/GameDefinition.ts:491](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L491)

***

### input?

> `optional` **input**: [`InputConfig`](InputConfig.md)

Defined in: [types/GameDefinition.ts:492](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L492)

***

### match3?

> `optional` **match3**: [`Match3Config`](Match3Config.md)

Defined in: [types/GameDefinition.ts:493](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L493)

***

### tetris?

> `optional` **tetris**: [`TetrisConfig`](TetrisConfig.md)

Defined in: [types/GameDefinition.ts:494](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L494)

***

### slotMachine?

> `optional` **slotMachine**: [`SlotMachineConfig`](SlotMachineConfig.md)

Defined in: [types/GameDefinition.ts:495](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L495)

***

### stateMachines?

> `optional` **stateMachines**: `StateMachineDefinition`[]

Defined in: [types/GameDefinition.ts:500](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L500)

Game-level state machines for managing game phases, turns, and flow.
Unlike entity-level machines, these have no `owner` field set.

***

### containers?

> `optional` **containers**: [`ContainerConfig`](../type-aliases/ContainerConfig.md)[]

Defined in: [types/GameDefinition.ts:505](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L505)

Container definitions for declarative container-based games (Ball Sort, Connect4, etc.).
Containers track entity membership, validate placements, and compute positions.

***

### persistence?

> `optional` **persistence**: [`PersistenceConfig`](PersistenceConfig.md)\<`unknown`\>

Defined in: [types/GameDefinition.ts:511](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L511)

Optional persistence configuration for saving/loading game progress.
Games opt-in to persistence by providing this configuration.
