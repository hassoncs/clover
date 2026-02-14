Slopcade Vision

 North Anyone create, remix, play infinite games



 Core Philosophy

 Everything Remixable

 fundamental insight **Games not monolithic**. composed

. scripts, physics, logic
 2. **Prefabs** entities (ball, paddle, brick
. **Assets** visuals
 4. aesthetic direction

 layers mixed matched independently.



 GAME = + VISUALS


  GAME (Logic) VISUALS (Assets
  Physics scripts Ball sprite
  Scoring system Paddle sprite
  Win/lose conditions Brick sprites
  Entity scripts Background
  Prefabs definitions

 Engine defines exists Assets define looks




 Separation of Concerns

Layer defines shared?

 Aesthetic prompt Halloween") Across games
  **Asset images game prefabs game forks
  Scripts, physics, prefabs forking
 Instance** active pack



 Data Model

 Themes, Reusable

 theme **reusable aesthetic applied game.


 Theme "Halloween"
 Prompt "dark spooky halloween pumpkins, bats, orange black
 Style "pixel"
 Used
 Breakout
 Slopeggle
 Flappy Bird Halloween Pack


 Themes-agnostic**. "Halloween theme generate assets Breakout, Slopeggle, other game.

 Game Engines (Forkable

 game engine defines


  "Breakout Bouncer"
  Prefabs
  ball, bounces
  paddle, player-controlled
  brick, destroyable
  wall, static
  Scripts
  Ball bounces off paddle walls
  destroys bricks collision
  loses life falls below paddle
  Win all bricks destroyed
 Physics
 Gravity none
 Bounce coefficient 1. 0
 Ball speed 300


Game engines **forked**. fork
  get own copy scripts
  modify anything
  fork shares asset packs original_game_id

Asset Packs (Game-Specific Collections

 specific game engine.


 Asset Pack "Breakout Halloween
 Game Breakout Bouncer
 Theme Halloween
 Entries
 ball sprite
 paddle sprite
 brick
 wall sprite


 Asset packs tied to forks share, not individual instances.

 Assets (Individual Images

 generated uploaded.


 Asset abc123
 Key "generated/breakout/halloween-pack/ball.
 Theme Halloween
 spooky pumpkin ball, halloween theme, pixel art...
 Breakout Halloween Pack slot


 Assets theme, cross-referencing.



 Fork Model




  Original Game "Breakout Classic"
  base_game_id game_001
  forked_from_id
  Prefabs [ball, paddle, brick, wall
  Asset Packs [Classic, Halloween, Sci-Fi

 forks

  Game "My Breakout"
  base_game_id_001! asset packs

  Prefabs [ball, paddle, brick, wall, powerup
  Asset Packs, Halloween, Sci-Fi Inherited access


 share_game_id, use packs.

 Fork Lineage


 Original (base_game_id, forked NULL

 Fork 1_game_id,

 Fork._game_id,

 Fork 2_game_id, Original


 games share_game_id A use same packs.



 Generation Flow

 Creating Themed Version


. selects game "Breakout Bouncer
. theme "Halloween creates
. creates pack theme_id
. prefab
. Combine theme prompt prefab description
. Generate image
. Upload R2
. Create asset record
. pack entry (prefab
. Mark pack complete
. Activate pack
. shows Halloween visuals!


  Prompt Hierarchy


  Final Prompt Theme Prompt Prefab Description Style Modifiers


  Theme spooky halloween pumpkins bats
  Prefab bouncing ball,, sprite
  Style art,, edges
  Final spooky halloween pumpkins bats,,
,,,,




  Principles

. No URL Storage

  URLs, never stored


  Database stores R2 keys
._key "generated/game123/pack456/ball.

  URLs constructed runtime
_BASE_URL. r2_key


  URLs change migration, domain changes. Keys stable.

. Source Truth

data lives one place



  Theme prompt._modifier `themes` table
  Asset image._key Content-addressed blobs
  Prefab→Asset mapping `assets` table with prefab assetId
  (Legacy pack system removed — assets now use BlobStore)

. Normalized, Not Duplicated

  Three tables, clear relationships


  themes_packs pack_entries assets


  No data duplication. Changes propagate.

. Everything Has Owner


  Theme creator_user_id
  Asset
  Pack
  Game user_id owns


  Enables attribution, permissions, discovery.

. Deletes

  Nothing deleted. `deleted_at


  deleted NULL show active records


  Enables recovery audit trails.



  User Journeys

  1: Play's Game


. Browse games
. "Breakout Halloween"
. Game loads Halloween asset pack
.!


  2: Fork Retheme


. "Breakout Classic
. "Fork
. own "My Breakout"
. "Change Theme"
.-Fi theme
. System generates prefabs
. Play Sci-Fi Breakout!


  Create New Theme


. Themes
. Theme
. Ocean sea coral reef, fish, bubbles, blue tones
. Theme created assets
. Apply game generate assets


  Journey 4: Explore Theme Gallery


. "Halloween
. packs
 Breakout (5
 Slopeggle (8
 Flappy Bird (3
. assets generated
. action


 Journey 5 Modify Game Engine


. "Breakout Classic
. Open game editor
. Add prefab "powerup
. Define script
. Generate powerup theme
. Publish modified game




  Technical Architecture

  Database


  ┌─────────────┐
  themes
  ├─────────────┤
  id │◄─────────────────────┐
  name
  prompt
  style
  └─────────────┘ │



  ┌──────┴──────┐
  assets_packs games
  ├─────────────┤
  id │◄──┐
  r2_key name definition
  theme_id base_game_id base_game_id│
  prompt theme_id └─────────────┘
  └─────────────┘

  ┌───────┴─────────┐
  assets
  ├─────────────────┤
  id
  content_hash
  r2_key
  └─────────────────┘


  ### Code Organization


  shared
  types
  GameDefinition. Game engine definition

  api/src/services
  BlobStore. Content-addressed asset storage

api/
  src/
  trpc/routes
-system. asset/theme/pack APIs
  ai
  scenario.. client
  pipeline Generation pipeline
  scripts
  theme-game. CLI tool

  app

  admin/themes Theme management UI
  play/[id]. Game player
  components
  ThemePicker. Theme selection




  Offline Mode Local Asset Serving



  native builds (iOS/Android, users
. Download game assets
. Play offline
. Switch between online/offline modes

 Architecture Overview





  ASSET RESOLUTION





 App requests "Give me ball. png"





  ┌───────────────┐

 Offline Mode?

  └───────┬───────┘ │



  ┌────────────┴────────────┐





  ┌─────────────┐

 OFFLINE ONLINE

  Local Server│ CDN │
  └─────────────┘ └─────────────┘





  localhost:8765/ cdn. slopcade. com

  games/breakout/ generated/game123/

  ball. png pack456/ball. png







  Downloading Game


. User clicks "Download Offline

. App fetches game manifest
 /api/games/offline-manifest
 Returns

 gameId "breakout-123,
 packId "halloween-pack",
..., Full game JSON
 scripts..., files

 prefabId "ball,/g/p.,
 prefabId "paddle,.,
...



. Download Manager downloads
 Fetch CDN..
 Save local_DATA/games{gameId

. manifest locally
.

. Mark game "downloaded local DB


 Playing Offline


. App starts offline mode

. Load game local manifest
 {APP_DATA}/games/{gameId}/manifest.

. Resolve URLs local server
 localhost:8765
 Request/games/{gameId}/generated/p/ball.
 reads/generated.
 Returns file

. Game engine receives local URLs, loads images


Local Structure


 {APP_DATA
 slopcade/
 settings. json offlineMode true/false
 downloaded-games. List downloaded game IDs
 games
 breakout-123/
 manifest. Game definition list
 scripts/
 game-scripts.
 generated/
 game123
 pack456/
 ball.
 paddle.
 brick.
 slopeggle-456/
...


 API Endpoints Needed

. Get Offline Manifest


 /api/games//offline-manifest
 Returns download game offline play

.
 gameId,
 packId?, Optional specific pack, active pack


 Returns
 gameId,
 packId,

 game definition JSON
,

 Scripts download

 name,
 url, CDN URL download
 hash, cache validation
,

 Assets download

 prefabId,
 r2Key, Path R2 local path
 url, CDN URL download
,
 height,
 hash?, cache validation
,

 Total size progress
 totalBytes,



. Check Download Status (Local


 Local function,
 async getDownloadedGames Promise<DownloadedGame

 Returns
 gameId,
 packId,
 downloadedAt,
 totalAssets,
 totalBytes,



 URL Resolution Changes


 shared/src/utils/asset-url.

 AssetUrlConfig
 offlineMode boolean
 localServerUrl:8765
 cdnBaseUrl. slopcade.
 gameId? string Required offline


 export getAssetUrl
 r2Key,
 AssetUrlConfig

. offlineMode
 Offline local server
 localhost:8765/games{gameId}/{r2Key
. localServerUrl.

 Online serve CDN
. cdnBaseUrl{r2Key




 Local Asset Server (Native Only

 HTTP server native app


/lib/offline/local-asset-server.

 createServer Expo local server
 FileSystem-system

 PORT 8765
 BASE_PATH FileSystem. documentDirectory 'slopcade/games

startLocalAssetServer
 createServer(async,
 Request /games{gameId/generated/ball.
 req...

!match
. writeHead(404)
. end('Not found
 return


, gameId, match
 localPath{BASE_PATH{gameId{assetPath


 fileInfo await FileSystem. getInfoAsync(localPath);
!fileInfo. exists
. writeHead(404)
. end'Asset not found
 return


 Read serve file
 await FileSystem. readAsStringAsync(localPath,
 encoding FileSystem. EncodingType. Base64,


. writeHead(200,
 'Content-Type 'image/png,
-Control-age=31536000,

. end(Buffer., 'base64

. writeHead(500);
.'Server error



. listen
. server http://localhost:${PORT

 return server



 Download Manager


/download-manager.

 import FileSystem-file-system

 BASE_PATH = FileSystem. documentDirectory/games

export async function downloadGameForOffline
 gameId string,
 ? (downloaded, total

. Fetch manifest API
 await.. offlineManifest. query gameId

. Create directory structure
 gameDir{BASE{gameId
 await FileSystem. makeDirectoryAsync(gameDir,

. Save manifest
 await FileSystem. writeAsStringAsync
{gameDir}manifest.,
.


. Download
 downloaded 0
.
 localPath{gameDir. r2Key

 Create parent directories
 parentDir localPath.,.
 await FileSystem. makeDirectoryAsync(parentDir,

 Download file
 await FileSystem. downloadAsync(asset.,


?.,..


. Mark downloaded
 await markGameDownloaded(gameId,.


 async function deleteOfflineGame(gameId Promise
 gameDir{BASE_PATH
 await FileSystem. deleteAsync(gameDir,
 unmarkGameDownloaded(gameId);


 export async function isGameDownloaded(gameId
manifestPath_PATH/manifest.
 info await FileSystem. getInfoAsync
 return info.



 Settings Mode Toggle


 app/lib/offline/settings.

 OfflineSettings
 offlineMode boolean Master toggle
 autoDownload boolean Auto-download games
 wifiOnlyDownload download WiFi


 React offline mode
 export useOfflineMode(
, setSettings useAsyncStorage<OfflineSettings
,
 offlineMode false, autoDownload, wifiOnlyDownload true


 toggleOfflineMode async boolean

 Start local server
 await

 Stop server


 setSettings..., offlineMode enabled


, toggleOfflineMode



 UI Components

 Download Button


 app/components/DownloadForOfflineButton.

DownloadForOfflineButton gameId string
 const [isDownloaded, useState
,
 [progress,

 useEffect
 isGameDownloaded(gameId.
,

 const handleDownload async
 setDownloading(true);
 downloadGameForOffline(gameId,,
 setProgress

 setDownloading(false);
 setIsDownloaded(true);


 handleDelete async
 deleteOfflineGame(gameId);
 setIsDownloaded(false);


 (downloading
 <ProgressBar progress{progress


 (isDownloaded
 <Button onPress={handleDelete Download</Button


 <Button onPress{handleDownload Offline</Button



 Offline Mode Toggle


/settings.

 OfflineSettingsSection
, toggleOfflineMode useOfflineMode
 downloadedGames useDownloadedGames


 title="Offline
 <Toggle
 label="Offline Mode
 downloaded games internet
{settings. offlineMode
{toggleOfflineMode


>Downloaded Games {downloadedGames.

 {downloadedGames.
 <DownloadedGameRow.gameId}={game} />

>


`

Development Simulating Offline Mode

 local development, simulate offline mode


, use local file server instead CDN

 config
 offlineMode.. SIMULATE_OFFLINE,
 localServerUrl:8765,
 cdnBaseUrl.. CDN_BASE_URL..,


 run file server
 npx serve. /test-assets 8765


 Implementation Phases



. Add `offlineManifest endpoint
. Create download manager progress
. Local file structure manifest storage
. Local HTTP server assets
. Update URL resolution check offline mode
. Download button, settings, progress
. Test airplane mode, partial downloads, cache invalidation

 Cases Handle



 Partial download (interrupted Resume manifest, skip existing files
 Asset pack updated Compare hashes, Available
 Storage full error, delete games
 Downloaded game deleted Keep local copy, "archived
 Multiple packs per game Download active pack,



 Future Vision

 Phase 1: Current (Asset System V3)

 Clean asset/pack/entry schema
Theme Pack Asset
 Fork shared packs

Phase 2: Theme Marketplace
 Public themes ratings
 "Featured "Trending themes
 creators get attribution
 apply theme game

 Phase 3: Asset Marketplace
 Individual assets shared
 Mix match assets packs
 "Use ball sprite game
 Asset creators get attribution

 Phase 4: Game Engine Prefabs
 Pre-built game engines, Puzzle, Shooter
 from Platformer prefab
 Customize scripts
 Share engines community

 Phase 5 Collaborative Creation
 Multiple users edit game
 Theme voting chooses
 Remix chains
 Attribution lineage visualization



 Glossary



 **Theme** reusable aesthetic direction
 **Asset** single generated image
 complete set assets game prefabs
 **Pack single prefab mapping
 entity type game engine,,.
 scripts, physics, prefab definitions
 **Game Instance** specific configuration active asset pack
 **Fork** copy game base_game_id
 root game ID
 **R2 path to asset Cloudflare R2 storage



 Success Metrics

 succeeded

. Fork → Theme Play under 30 seconds
. Average theme used 5+ games
. Users play other themed games
. Creators see themes/engines used
. Single code path CLI web UI
