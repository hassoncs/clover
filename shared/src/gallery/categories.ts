import type { GallerySection, GallerySectionId } from './types';

export const GALLERY_SECTIONS: GallerySection[] = [
  {
    id: 'effects',
    title: 'Visual Effects',
    description: 'Shader-based effects like glow, blur, distortion, and color filters',
    icon: '✨',
    color: '#4ecdc4',
  },
  {
    id: 'particles',
    title: 'Particle Systems',
    description: 'CPU-based particle emitters for fire, smoke, sparks, and more',
    icon: '🔥',
    color: '#ff6b6b',
  },
  {
    id: 'behaviors',
    title: 'Behaviors',
    description: 'Entity logic like movement, controls, collisions, and spawning',
    icon: '⚡',
    color: '#ffe66d',
  },
  {
    id: 'sprites',
    title: 'Sprite Types',
    description: 'Visual representations: rectangles, circles, polygons, and images',
    icon: '🎨',
    color: '#a8dadc',
  },
  {
    id: 'physics',
    title: 'Physics',
    description: 'Bodies, shapes, joints, and forces powered by Box2D',
    icon: '⚙️',
    color: '#957dad',
  },
];

export const GALLERY_SECTIONS_BY_ID: Record<GallerySectionId, GallerySection> = 
  Object.fromEntries(GALLERY_SECTIONS.map(s => [s.id, s])) as Record<GallerySectionId, GallerySection>;

export function getGallerySection(id: GallerySectionId): GallerySection {
  const section = GALLERY_SECTIONS_BY_ID[id];
  if (!section) {
    throw new Error(`Unknown gallery section: ${id}`);
  }
  return section;
}
