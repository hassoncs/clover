export { SystemPhase } from "../types/system-phase";
export function parseVersion(versionString) {
    const parts = versionString.split(".").map(Number);
    return {
        major: parts[0] ?? 0,
        minor: parts[1] ?? 0,
        patch: parts[2] ?? 0,
    };
}
export function formatVersion(version) {
    return `${version.major}.${version.minor}.${version.patch}`;
}
export function isCompatibleVersion(required, available) {
    if (available.major !== required.major) {
        return false;
    }
    if (available.minor < required.minor) {
        return false;
    }
    return true;
}
//# sourceMappingURL=types.js.map