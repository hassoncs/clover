const FNV_OFFSET_64 = BigInt("0xcbf29ce484222325");
const FNV_PRIME_64 = BigInt("0x100000001b3");
const MASK_64 = BigInt("0xffffffffffffffff");

export function hashStringFNV1a64(input: string): string {
	let hash = FNV_OFFSET_64;
	for (let i = 0; i < input.length; i++) {
		hash ^= BigInt(input.charCodeAt(i));
		hash = (hash * FNV_PRIME_64) & MASK_64;
	}
	return hash.toString(16).padStart(16, "0");
}

function stableStringify(value: unknown): string {
	if (value === null || value === undefined) return String(value);
	if (typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return "[" + value.map(stableStringify).join(",") + "]";
	}
	const keys = Object.keys(value as Record<string, unknown>).sort();
	return (
		"{" +
		keys
			.map(
				(k) =>
					JSON.stringify(k) +
					":" +
					stableStringify((value as Record<string, unknown>)[k]),
			)
			.join(",") +
		"}"
	);
}

export function hashJsonStable(input: unknown): string {
	return hashStringFNV1a64(stableStringify(input));
}
