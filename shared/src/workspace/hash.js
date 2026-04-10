const FNV_OFFSET_64 = BigInt("0xcbf29ce484222325");
const FNV_PRIME_64 = BigInt("0x100000001b3");
const MASK_64 = BigInt("0xffffffffffffffff");
export function hashStringFNV1a64(input) {
    let hash = FNV_OFFSET_64;
    for (let i = 0; i < input.length; i++) {
        hash ^= BigInt(input.charCodeAt(i));
        hash = (hash * FNV_PRIME_64) & MASK_64;
    }
    return hash.toString(16).padStart(16, "0");
}
function stableStringify(value) {
    if (value === null || value === undefined)
        return String(value);
    if (typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value)) {
        return "[" + value.map(stableStringify).join(",") + "]";
    }
    const keys = Object.keys(value).sort();
    return ("{" +
        keys
            .map((k) => JSON.stringify(k) +
            ":" +
            stableStringify(value[k]))
            .join(",") +
        "}");
}
export function hashJsonStable(input) {
    return hashStringFNV1a64(stableStringify(input));
}
//# sourceMappingURL=hash.js.map