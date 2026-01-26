export class TagRegistry {
  private tagToId = new Map<string, number>();
  private idToTag = new Map<number, string>();
  private nextId = 0;

  intern(tag: string): number {
    const existing = this.tagToId.get(tag);
    if (existing !== undefined) {
      return existing;
    }
    
    const id = this.nextId++;
    this.tagToId.set(tag, id);
    this.idToTag.set(id, tag);
    return id;
  }

  getId(tag: string): number | undefined {
    return this.tagToId.get(tag);
  }

  getTag(id: number): string | undefined {
    return this.idToTag.get(id);
  }

  has(tag: string): boolean {
    return this.tagToId.has(tag);
  }

  get size(): number {
    return this.tagToId.size;
  }

  clear(): void {
    this.tagToId.clear();
    this.idToTag.clear();
    this.nextId = 0;
  }

  getAllTags(): string[] {
    return Array.from(this.tagToId.keys());
  }
}

let globalTagRegistry: TagRegistry | null = null;

export function getGlobalTagRegistry(): TagRegistry {
  if (!globalTagRegistry) {
    globalTagRegistry = new TagRegistry();
  }
  return globalTagRegistry;
}

export function resetGlobalTagRegistry(): void {
  globalTagRegistry = null;
}
