export class WatchRegistry {
    watches = new Map();
    activeConfig = {
        frameProperties: new Set(),
        changeProperties: new Map(),
        entityWatches: new Map(),
        tagWatches: new Map(),
    };
    addWatch(spec) {
        const key = this.generateWatchKey(spec);
        if (this.watches.has(key)) {
            return;
        }
        this.watches.set(key, spec);
        this.updateActiveConfig(spec);
    }
    addWatches(specs) {
        for (const spec of specs) {
            this.addWatch(spec);
        }
    }
    removeWatch(spec) {
        const key = this.generateWatchKey(spec);
        this.watches.delete(key);
        this.rebuildActiveConfig();
    }
    clear() {
        this.watches.clear();
        this.activeConfig = {
            frameProperties: new Set(),
            changeProperties: new Map(),
            entityWatches: new Map(),
            tagWatches: new Map(),
        };
    }
    getActiveConfig() {
        return this.activeConfig;
    }
    getAllWatches() {
        return Array.from(this.watches.values());
    }
    getWatchesForProperty(property) {
        return Array.from(this.watches.values()).filter(w => w.property === property);
    }
    getWatchesForScope(scope) {
        return Array.from(this.watches.values()).filter(w => this.scopesMatch(w.scope, scope));
    }
    generateWatchKey(spec) {
        const scopeKey = this.serializeScope(spec.scope);
        return `${spec.property}:${scopeKey}:${spec.frequency}`;
    }
    serializeScope(scope) {
        switch (scope.type) {
            case 'all':
                return 'all';
            case 'self':
                return 'self';
            case 'by_tag':
                return `tag:${scope.tag}`;
            case 'by_id':
                return `id:${scope.entityId}`;
        }
    }
    scopesMatch(a, b) {
        if (a.type !== b.type)
            return false;
        switch (a.type) {
            case 'all':
            case 'self':
                return true;
            case 'by_tag':
                return b.type === 'by_tag' && a.tag === b.tag;
            case 'by_id':
                return b.type === 'by_id' && a.entityId === b.entityId;
        }
    }
    updateActiveConfig(spec) {
        if (spec.frequency === 'frame' && spec.scope.type === 'all') {
            this.activeConfig.frameProperties.add(spec.property);
        }
        if (spec.frequency === 'change') {
            if (spec.scope.type === 'by_id') {
                const entityIds = this.activeConfig.changeProperties.get(spec.property) ?? new Set();
                entityIds.add(spec.scope.entityId);
                this.activeConfig.changeProperties.set(spec.property, entityIds);
            }
        }
        if (spec.scope.type === 'by_id') {
            const properties = this.activeConfig.entityWatches.get(spec.scope.entityId) ?? new Set();
            properties.add(spec.property);
            this.activeConfig.entityWatches.set(spec.scope.entityId, properties);
        }
        if (spec.scope.type === 'by_tag') {
            const properties = this.activeConfig.tagWatches.get(spec.scope.tag) ?? new Set();
            properties.add(spec.property);
            this.activeConfig.tagWatches.set(spec.scope.tag, properties);
        }
    }
    rebuildActiveConfig() {
        this.activeConfig = {
            frameProperties: new Set(),
            changeProperties: new Map(),
            entityWatches: new Map(),
            tagWatches: new Map(),
        };
        for (const spec of this.watches.values()) {
            this.updateActiveConfig(spec);
        }
    }
}
//# sourceMappingURL=WatchRegistry.js.map