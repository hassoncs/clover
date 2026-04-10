import { type DesignDocument } from "./design";
/**
 * Migrates a design document from older versions to the current version (1.1).
 * Handles legacy documents (v0.x) that might be missing a version field.
 */
export declare function migrateDesignDocument(data: unknown): DesignDocument;
//# sourceMappingURL=design-migrations.d.ts.map