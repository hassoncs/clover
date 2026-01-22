import type { 
  GalleryItem, 
  GallerySectionId, 
  AnyGalleryItem,
  EffectGalleryItem,
  ParticleGalleryItem,
  BehaviorGalleryItem,
  SpriteGalleryItem,
  PhysicsGalleryItem,
} from './types';
import { GALLERY_SECTIONS } from './categories';

const registry: Map<GallerySectionId, GalleryItem[]> = new Map();

GALLERY_SECTIONS.forEach(section => {
  registry.set(section.id, []);
});

export function registerGalleryItem(item: AnyGalleryItem): void {
  const section = registry.get(item.section);
  if (!section) {
    throw new Error(`Unknown section: ${item.section}`);
  }
  const existing = section.find(i => i.id === item.id);
  if (existing) {
    throw new Error(`Duplicate gallery item id: ${item.id} in section ${item.section}`);
  }
  section.push(item);
}

export function getGalleryItems(sectionId: GallerySectionId): GalleryItem[] {
  return registry.get(sectionId) ?? [];
}

export function getGalleryItem(sectionId: GallerySectionId, itemId: string): GalleryItem | undefined {
  return registry.get(sectionId)?.find(item => item.id === itemId);
}

export function getAllGalleryItems(): AnyGalleryItem[] {
  const allItems: AnyGalleryItem[] = [];
  registry.forEach(items => {
    allItems.push(...(items as AnyGalleryItem[]));
  });
  return allItems;
}

export function getEffectItems(): EffectGalleryItem[] {
  return getGalleryItems('effects') as EffectGalleryItem[];
}

export function getParticleItems(): ParticleGalleryItem[] {
  return getGalleryItems('particles') as ParticleGalleryItem[];
}

export function getBehaviorItems(): BehaviorGalleryItem[] {
  return getGalleryItems('behaviors') as BehaviorGalleryItem[];
}

export function getSpriteItems(): SpriteGalleryItem[] {
  return getGalleryItems('sprites') as SpriteGalleryItem[];
}

export function getPhysicsItems(): PhysicsGalleryItem[] {
  return getGalleryItems('physics') as PhysicsGalleryItem[];
}

export function getItemsByCategory(sectionId: GallerySectionId, category: string): GalleryItem[] {
  return getGalleryItems(sectionId).filter(item => item.category === category);
}

export function searchGalleryItems(query: string): AnyGalleryItem[] {
  const lowerQuery = query.toLowerCase();
  return getAllGalleryItems().filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery) ||
    item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
