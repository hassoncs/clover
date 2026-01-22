import type { SpriteType } from '../../types/sprite';
import type { SpriteGalleryItem, ParamDefinition } from '../types';
import { registerGalleryItem } from '../registry';

interface SpriteDefinition {
  type: SpriteType;
  title: string;
  description: string;
  params: ParamDefinition[];
  defaultParams: Record<string, unknown>;
}

const SPRITE_DEFINITIONS: SpriteDefinition[] = [
  {
    type: 'rect',
    title: 'Rectangle',
    description: 'A rectangular shape with configurable dimensions and styling',
    params: [
      { key: 'width', type: 'number', displayName: 'Width', min: 1, max: 500, step: 5, defaultValue: 100 },
      { key: 'height', type: 'number', displayName: 'Height', min: 1, max: 500, step: 5, defaultValue: 100 },
      { key: 'color', type: 'color', displayName: 'Fill Color', defaultValue: '#4ecdc4' },
      { key: 'strokeColor', type: 'color', displayName: 'Stroke Color', defaultValue: '#333333' },
      { key: 'strokeWidth', type: 'number', displayName: 'Stroke Width', min: 0, max: 10, step: 1, defaultValue: 0 },
      { key: 'opacity', type: 'number', displayName: 'Opacity', min: 0, max: 1, step: 0.1, defaultValue: 1 },
    ],
    defaultParams: { width: 100, height: 100, color: '#4ecdc4', strokeColor: '#333333', strokeWidth: 0, opacity: 1 },
  },
  {
    type: 'circle',
    title: 'Circle',
    description: 'A circular shape with configurable radius and styling',
    params: [
      { key: 'radius', type: 'number', displayName: 'Radius', min: 1, max: 250, step: 5, defaultValue: 50 },
      { key: 'color', type: 'color', displayName: 'Fill Color', defaultValue: '#ff6b6b' },
      { key: 'strokeColor', type: 'color', displayName: 'Stroke Color', defaultValue: '#333333' },
      { key: 'strokeWidth', type: 'number', displayName: 'Stroke Width', min: 0, max: 10, step: 1, defaultValue: 0 },
      { key: 'opacity', type: 'number', displayName: 'Opacity', min: 0, max: 1, step: 0.1, defaultValue: 1 },
    ],
    defaultParams: { radius: 50, color: '#ff6b6b', strokeColor: '#333333', strokeWidth: 0, opacity: 1 },
  },
  {
    type: 'polygon',
    title: 'Polygon',
    description: 'A custom polygon shape defined by vertices',
    params: [
      { key: 'sides', type: 'number', displayName: 'Sides', min: 3, max: 12, step: 1, defaultValue: 6 },
      { key: 'size', type: 'number', displayName: 'Size', min: 10, max: 200, step: 5, defaultValue: 50 },
      { key: 'color', type: 'color', displayName: 'Fill Color', defaultValue: '#ffe66d' },
      { key: 'strokeColor', type: 'color', displayName: 'Stroke Color', defaultValue: '#333333' },
      { key: 'strokeWidth', type: 'number', displayName: 'Stroke Width', min: 0, max: 10, step: 1, defaultValue: 0 },
      { key: 'opacity', type: 'number', displayName: 'Opacity', min: 0, max: 1, step: 0.1, defaultValue: 1 },
    ],
    defaultParams: { sides: 6, size: 50, color: '#ffe66d', strokeColor: '#333333', strokeWidth: 0, opacity: 1 },
  },
  {
    type: 'image',
    title: 'Image',
    description: 'An image sprite loaded from a URL',
    params: [
      { key: 'imageWidth', type: 'number', displayName: 'Width', min: 1, max: 500, step: 5, defaultValue: 100 },
      { key: 'imageHeight', type: 'number', displayName: 'Height', min: 1, max: 500, step: 5, defaultValue: 100 },
      { key: 'opacity', type: 'number', displayName: 'Opacity', min: 0, max: 1, step: 0.1, defaultValue: 1 },
    ],
    defaultParams: { imageWidth: 100, imageHeight: 100, opacity: 1, imageUrl: '' },
  },
];

function generatePolygonVertices(sides: number, size: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    vertices.push({
      x: Math.cos(angle) * size,
      y: Math.sin(angle) * size,
    });
  }
  return vertices;
}

function createSpriteGalleryItem(def: SpriteDefinition): SpriteGalleryItem {
  return {
    id: `sprite-${def.type}`,
    section: 'sprites',
    title: def.title,
    description: def.description,
    spriteType: def.type,
    tags: ['visual', 'rendering', 'shape'],
    params: def.params,
    defaultParams: def.defaultParams,
    getExportJSON: (currentParams) => {
      const base: Record<string, unknown> = {
        type: def.type,
        ...currentParams,
      };
      
      if (def.type === 'polygon' && typeof currentParams.sides === 'number' && typeof currentParams.size === 'number') {
        base.vertices = generatePolygonVertices(currentParams.sides as number, currentParams.size as number);
        delete base.sides;
        delete base.size;
      }
      
      return base;
    },
    getUsageExample: (currentParams) => {
      if (def.type === 'polygon') {
        return `
// Polygon sprite
{
  type: 'polygon',
  vertices: [
    { x: 0, y: -${currentParams.size} },
    { x: ${Math.round((currentParams.size as number) * 0.87)}, y: ${Math.round((currentParams.size as number) * 0.5)} },
    { x: -${Math.round((currentParams.size as number) * 0.87)}, y: ${Math.round((currentParams.size as number) * 0.5)} },
  ],
  color: '${currentParams.color}',
  opacity: ${currentParams.opacity}
}`;
      }
      
      return `
// ${def.title} sprite
{
  type: '${def.type}',
  ${Object.entries(currentParams)
    .filter(([key]) => key !== 'sides' && key !== 'size')
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `'${value}'` : value}`)
    .join(',\n  ')}
}`;
    },
  };
}

export function registerSpriteItems(): void {
  SPRITE_DEFINITIONS.forEach(def => {
    registerGalleryItem(createSpriteGalleryItem(def));
  });
}

export const SPRITE_GALLERY_ITEMS = SPRITE_DEFINITIONS.map(createSpriteGalleryItem);
