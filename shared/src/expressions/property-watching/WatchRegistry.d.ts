import type { PropertyWatchSpec, ActiveWatchConfig, PropertyPath, WatchScope } from './types';
export declare class WatchRegistry {
    private watches;
    private activeConfig;
    addWatch(spec: PropertyWatchSpec): void;
    addWatches(specs: PropertyWatchSpec[]): void;
    removeWatch(spec: PropertyWatchSpec): void;
    clear(): void;
    getActiveConfig(): ActiveWatchConfig;
    getAllWatches(): PropertyWatchSpec[];
    getWatchesForProperty(property: PropertyPath): PropertyWatchSpec[];
    getWatchesForScope(scope: WatchScope): PropertyWatchSpec[];
    private generateWatchKey;
    private serializeScope;
    private scopesMatch;
    private updateActiveConfig;
    private rebuildActiveConfig;
}
//# sourceMappingURL=WatchRegistry.d.ts.map