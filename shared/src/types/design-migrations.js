import { DesignDocumentSchema, DesignSchemaError, } from "./design";
/**
 * Migrates a design document from older versions to the current version (1.1).
 * Handles legacy documents (v0.x) that might be missing a version field.
 */
export function migrateDesignDocument(data) {
    if (typeof data !== "object" || data === null) {
        throw new DesignSchemaError("Invalid design document: not an object");
    }
    const raw = data;
    let current = { ...raw };
    // 1. Handle legacy v0.x (no version field)
    if (!current.version) {
        console.warn("[design] migrated from v0.x to v1.1");
        current = {
            version: "1.1",
            metadata: current.metadata || {
                title: "Migrated Design",
                gameId: "unknown",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            frames: current.frames || [],
        };
    }
    // 2. Handle v1.0 -> v1.1
    if (current.version === "1.0") {
        current.version = "1.1";
    }
    // 3. Validate current version
    if (current.version !== "1.1") {
        throw new DesignSchemaError(`unsupported version: ${current.version}`);
    }
    // 4. Final validation against schema
    const result = DesignDocumentSchema.safeParse(current);
    if (!result.success) {
        throw new DesignSchemaError(`Invalid design document schema after migration: ${result.error.message}`);
    }
    return result.data;
}
//# sourceMappingURL=design-migrations.js.map