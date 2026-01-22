import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';
import { BALL_LAUNCHER_TEMPLATE } from './ballLauncher';
import { STACK_ATTACK_TEMPLATE } from './stackAttack';
import { JUMPY_CAT_TEMPLATE } from './jumpyCat';
import { HILL_RACER_TEMPLATE } from './hillRacer';
import { FALLING_CATCHER_TEMPLATE } from './fallingCatcher';

export type GameType =
  | 'projectile'
  | 'platformer'
  | 'stacking'
  | 'vehicle'
  | 'falling_objects'
  | 'rope_physics';

export const GAME_TEMPLATES: Record<GameType, GameDefinition> = {
  projectile: BALL_LAUNCHER_TEMPLATE,
  stacking: STACK_ATTACK_TEMPLATE,
  platformer: JUMPY_CAT_TEMPLATE,
  vehicle: HILL_RACER_TEMPLATE,
  falling_objects: FALLING_CATCHER_TEMPLATE,
  rope_physics: BALL_LAUNCHER_TEMPLATE,
};

export function getTemplateForGameType(gameType: GameType): GameDefinition {
  return GAME_TEMPLATES[gameType] ?? BALL_LAUNCHER_TEMPLATE;
}

export function getRandomTemplate(): GameDefinition {
  const types = Object.keys(GAME_TEMPLATES) as GameType[];
  const randomType = types[Math.floor(Math.random() * types.length)];
  return GAME_TEMPLATES[randomType];
}

export {
  BALL_LAUNCHER_TEMPLATE,
  STACK_ATTACK_TEMPLATE,
  JUMPY_CAT_TEMPLATE,
  HILL_RACER_TEMPLATE,
  FALLING_CATCHER_TEMPLATE,
};
