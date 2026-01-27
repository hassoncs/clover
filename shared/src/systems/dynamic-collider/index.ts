import type { GameSystemDefinition } from '../types';
import type { DynamicColliderConfig } from './types';

export const DYNAMIC_COLLIDER_SYSTEM_ID = 'dynamic-collider';
export const DYNAMIC_COLLIDER_VERSION = { major: 1, minor: 0, patch: 0 };

export const dynamicColliderSystem: GameSystemDefinition<DynamicColliderConfig> = {
  id: DYNAMIC_COLLIDER_SYSTEM_ID,
  version: DYNAMIC_COLLIDER_VERSION,
  actionTypes: ['set_entity_size'],
  behaviorTypes: [],
  expressionFunctions: {
    entityScale: (args, ctx) => {
      if (args.length < 1) {
        throw new Error('entityScale(entityIdOrTag) requires 1 argument');
      }
      const idOrTag = String(args[0]);
      if (!ctx.entityManager) return 1;
      
      const entity = ctx.entityManager.getEntity(idOrTag) 
        ?? ctx.entityManager.getEntitiesByTag(idOrTag)[0];
      
      if (!entity) return 1;
      return entity.transform.scaleX;
    },
    
    entityWidth: (args, ctx) => {
      if (args.length < 1) {
        throw new Error('entityWidth(entityIdOrTag) requires 1 argument');
      }
      const idOrTag = String(args[0]);
      if (!ctx.entityManager) return 0;
      
      const entity = ctx.entityManager.getEntity(idOrTag)
        ?? ctx.entityManager.getEntitiesByTag(idOrTag)[0];
      
      if (!entity?.sprite) return 0;
      
      const sprite = entity.sprite;
      if (sprite.type === 'rect' && sprite.width !== undefined) {
        return sprite.width * entity.transform.scaleX;
      }
      if (sprite.type === 'circle' && sprite.radius !== undefined) {
        return sprite.radius * 2 * entity.transform.scaleX;
      }
      return 0;
    },
    
    entityHeight: (args, ctx) => {
      if (args.length < 1) {
        throw new Error('entityHeight(entityIdOrTag) requires 1 argument');
      }
      const idOrTag = String(args[0]);
      if (!ctx.entityManager) return 0;
      
      const entity = ctx.entityManager.getEntity(idOrTag)
        ?? ctx.entityManager.getEntitiesByTag(idOrTag)[0];
      
      if (!entity?.sprite) return 0;
      
      const sprite = entity.sprite;
      if (sprite.type === 'rect' && sprite.height !== undefined) {
        return sprite.height * entity.transform.scaleY;
      }
      if (sprite.type === 'circle' && sprite.radius !== undefined) {
        return sprite.radius * 2 * entity.transform.scaleY;
      }
      return 0;
    },
    
    entityRadius: (args, ctx) => {
      if (args.length < 1) {
        throw new Error('entityRadius(entityIdOrTag) requires 1 argument');
      }
      const idOrTag = String(args[0]);
      if (!ctx.entityManager) return 0;
      
      const entity = ctx.entityManager.getEntity(idOrTag)
        ?? ctx.entityManager.getEntitiesByTag(idOrTag)[0];
      
      if (!entity?.sprite) return 0;
      
      const sprite = entity.sprite;
      if (sprite.type === 'circle' && sprite.radius !== undefined) {
        return sprite.radius * entity.transform.scaleX;
      }
      if (sprite.type === 'rect' && sprite.width !== undefined && sprite.height !== undefined) {
        return Math.max(sprite.width, sprite.height) * entity.transform.scaleX / 2;
      }
      return 0;
    },
  },
};

export * from './types';
