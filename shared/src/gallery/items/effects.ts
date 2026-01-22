import { 
  EFFECT_METADATA, 
  type EffectType, 
  type EffectMetadata,
  type EffectParamMeta,
} from '../../types/effects';
import type { EffectGalleryItem, ParamDefinition } from '../types';
import { registerGalleryItem } from '../registry';

function convertEffectParam(param: EffectParamMeta): ParamDefinition {
  return {
    key: param.key,
    type: param.type as ParamDefinition['type'],
    displayName: param.displayName,
    defaultValue: param.defaultValue,
    min: param.min,
    max: param.max,
    step: param.step,
    options: param.options,
  };
}

function createEffectGalleryItem(meta: EffectMetadata): EffectGalleryItem {
  const params = meta.params.map(convertEffectParam);
  const defaultParams: Record<string, unknown> = {};
  params.forEach(p => {
    defaultParams[p.key] = p.defaultValue;
  });

  return {
    id: `effect-${meta.type}`,
    section: 'effects',
    title: meta.displayName,
    description: meta.description,
    category: meta.category,
    effectType: meta.type,
    tags: [meta.category, 'shader', 'visual'],
    params,
    defaultParams,
    getExportJSON: (currentParams) => ({
      type: meta.type,
      ...currentParams,
    }),
    getUsageExample: (currentParams) => `
// Add to sprite.effects array
{
  type: '${meta.type}',
  ${Object.entries(currentParams)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(',\n  ')}
}`,
  };
}

const effectTypes: EffectType[] = [
  'glow',
  'innerGlow',
  'outline',
  'dropShadow',
  'tint',
  'holographic',
  'pixelate',
  'dissolve',
  'waveDistortion',
  'shockwave',
  'chromaticAberration',
  'vignette',
  'scanlines',
  'posterize',
  'blur',
  'motionBlur',
  'rimLight',
  'colorMatrix',
];

export function registerEffectItems(): void {
  effectTypes.forEach(type => {
    const meta = EFFECT_METADATA[type];
    if (meta) {
      registerGalleryItem(createEffectGalleryItem(meta));
    }
  });
}

export const EFFECT_GALLERY_ITEMS = effectTypes.map(type => {
  const meta = EFFECT_METADATA[type];
  return createEffectGalleryItem(meta);
});
