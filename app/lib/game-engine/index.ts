export { EntityManager } from './EntityManager';
export { BehaviorExecutor, createBehaviorExecutor } from './BehaviorExecutor';
export { RulesEvaluator } from './RulesEvaluator';
export {
  GameLoader,
  validateGameDefinition,
  createDefaultGameDefinition,
} from './GameLoader';
export { GameRuntime } from './GameRuntime';
export { CameraSystem } from './CameraSystem';
export { ViewportSystem } from './ViewportSystem';
export { ViewportProvider, useViewport } from './ViewportContext';
export {
  createCollisionBodiesFromTileMap,
  destroyTileMapBodies,
} from './TileMapPhysics';
export type { BehaviorHandler } from './BehaviorExecutor';
export type { RuleContext } from './RulesEvaluator';
export type { LoadedGame, GameLoaderOptions } from './GameLoader';
export type { CameraConfig, ViewportSize, CameraTransform } from './CameraSystem';
export type { ViewportRect, ViewportConfig } from './ViewportSystem';
export * from './BehaviorContext';
export * from './types';
export * from './renderers';
