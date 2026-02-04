/**
 * @slopcade/games - Game definitions package
 * 
 * This package contains all game definitions (TypeScript and bundled).
 * Games are loaded dynamically to avoid bundling all games into the main app.
 */

export {
  GAME_REGISTRY,
  GAME_IDS,
  isValidGameId,
  loadGame,
  loadAllGames,
  clearCache,
  type GameModule,
  type GameEntry,
} from './registry';
