/**
 * Composable Game Systems
 * 
 * This module provides a registry for modular game systems that can be
 * added or removed without affecting the core engine. Each system:
 * 
 * 1. Registers its schema extensions (types)
 * 2. Registers its expression functions
 * 3. Registers its behaviors
 * 4. Registers its actions
 * 5. Declares its version for compatibility checking
 * 
 * Games declare which systems they use via `systems` in GameDefinition.
 * On load, the engine validates that all required systems are available
 * and their versions are compatible.
 */

export * from './GameSystemRegistry';
export * from './types';
export * from './match3';
