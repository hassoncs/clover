import { createHash } from "node:crypto";

/**
 * Normalize content text for deduplication:
 * - Convert to lowercase
 * - Strip leading/trailing whitespace
 * - Collapse multiple whitespace to single space
 */
export function normalizeContent(text: string): string {
	return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Compute SHA-256 hash of normalized content text
 */
export function computeContentHash(text: string): string {
	const normalized = normalizeContent(text);
	return createHash("sha256").update(normalized, "utf8").digest("hex");
}
