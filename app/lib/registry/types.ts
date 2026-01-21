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

/**
 * Test game module metadata.
 * Extends ModuleMeta - title required, everything else optional.
 */
export interface TestGameMeta extends ModuleMeta {}

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
