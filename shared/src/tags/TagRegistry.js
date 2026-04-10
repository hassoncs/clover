export class TagRegistry {
    tagToId = new Map();
    idToTag = new Map();
    nextId = 0;
    intern(tag) {
        const existing = this.tagToId.get(tag);
        if (existing !== undefined) {
            return existing;
        }
        const id = this.nextId++;
        this.tagToId.set(tag, id);
        this.idToTag.set(id, tag);
        return id;
    }
    getId(tag) {
        return this.tagToId.get(tag);
    }
    getTag(id) {
        return this.idToTag.get(id);
    }
    has(tag) {
        return this.tagToId.has(tag);
    }
    get size() {
        return this.tagToId.size;
    }
    clear() {
        this.tagToId.clear();
        this.idToTag.clear();
        this.nextId = 0;
    }
    getAllTags() {
        return Array.from(this.tagToId.keys());
    }
}
let globalTagRegistry = null;
export function getGlobalTagRegistry() {
    if (!globalTagRegistry) {
        globalTagRegistry = new TagRegistry();
    }
    return globalTagRegistry;
}
export function resetGlobalTagRegistry() {
    globalTagRegistry = null;
}
//# sourceMappingURL=TagRegistry.js.map