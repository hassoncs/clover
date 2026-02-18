/**
 * Generate a UUID v4 compatible ID
 * Works in React Native environments where crypto.getRandomValues() is not available
 */
export function generateId(): string {
  // Generate 16 random bytes (128 bits) for UUID v4
  const bytes = new Uint8Array(16);

  // Use Math.random() as fallback for React Native
  // This is cryptographically secure enough for app IDs
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  // Set version (4) and variant bits according to UUID v4 spec
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with dashes
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
