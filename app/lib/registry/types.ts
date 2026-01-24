import type { ComponentType } from "react";

/**
 * Base metadata interface for all registry modules.
 * Only `title` is required - modules can add any additional fields.
 * 
 * @example
 * export const metadata: ModuleMeta = {
 *   title: "My Example",
 *   description: "Optional description",
 *   category: "physics",
 *   difficulty: 3,
 * };
 */
export interface ModuleMeta {
  title: string;
  description?: string;
  [key: string]: unknown;
}

export interface RegistryEntryBase {
  id: string;
  href: string;
}

/**
 * Example module metadata.
 * Extends ModuleMeta - title required, everything else optional.
 */
export interface ExampleMeta extends ModuleMeta {}

export interface ExampleEntry extends RegistryEntryBase {
  meta: ExampleMeta;
}

export type GameStatus = "active" | "archived" | "beta";
export type GameCategory = "arcade" | "puzzle" | "physics-demo" | "action" | "casual";
export type PlayerCount = 1 | 2 | "1-2" | "1-4";

export interface TestGameMeta extends ModuleMeta {
  status?: GameStatus;
  category?: GameCategory;
  tags?: string[];
  author?: string;
  players?: PlayerCount;
  /** Server-side rating (thumbs up/down ratio) - not set in source files */
  rating?: number;
  /** Small thumbnail for game lists */
  thumbnailUrl?: string;
  /** Large hero image for game detail screen */
  titleHeroImageUrl?: string;
}

export interface TestGameEntry extends RegistryEntryBase {
  meta: TestGameMeta;
}

/**
 * Shader module metadata.
 * @deprecated Use ModuleMeta with title instead of name
 */
export interface ShaderMeta extends ModuleMeta {
  /** @deprecated Use title instead */
  name?: string;
  category?: string;
}

export interface ShaderEntry extends RegistryEntryBase {
  meta: ShaderMeta;
}

/**
 * Effect module metadata.
 * @deprecated Use ModuleMeta with title instead of name  
 */
export interface EffectMeta extends ModuleMeta {
  /** @deprecated Use title instead */
  name?: string;
  type?: string;
}

export interface EffectEntry extends RegistryEntryBase {
  meta: EffectMeta;
}

export type LazyComponent<P = object> = React.LazyExoticComponent<ComponentType<P>>;

export type ComponentLoader<P = object> = () => Promise<{ default: ComponentType<P> }>;

export type DataLoader<T> = () => Promise<{ default: T }>;
