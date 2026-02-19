export function normalizeContent(text: string): string {
	return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function computeContentHash(text: string): Promise<string> {
	const normalized = normalizeContent(text);
	const encoder = new TextEncoder();
	const data = encoder.encode(normalized);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
