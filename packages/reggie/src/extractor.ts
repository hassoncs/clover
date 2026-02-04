import { readFileSync } from 'node:fs';

const METADATA_PATTERN = /export\s+const\s+metadata\s*(?::\s*\w+)?\s*=\s*(\{[\s\S]*?\});/;

export function extractMetadata(filePath: string): Record<string, unknown> | null {
  const content = readFileSync(filePath, 'utf-8');

  if (!content.includes('export const metadata')) {
    return null;
  }

  const match = content.match(METADATA_PATTERN);
  if (!match) return null;

  try {
    const jsonified = match[1]
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(jsonified);
  } catch {
    return { _parseError: true };
  }
}
