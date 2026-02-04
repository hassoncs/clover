import { glob } from 'glob';
import { resolve, relative } from 'node:path';
import type { RegistryConfig, ParsedEntry } from './types.js';
import { extractMetadata } from './extractor.js';

export async function scanFiles(
  config: RegistryConfig,
  rootDir: string
): Promise<ParsedEntry[]> {
  const sourceDir = resolve(rootDir, config.sourceDir);
  const pattern = resolve(sourceDir, config.include);
  
  const files = await glob(pattern, {
    ignore: config.exclude?.map(p => 
      p.includes('/') ? resolve(sourceDir, p) : `**/${p}`
    ),
    nodir: true,
    absolute: true,
  });

  const entries: ParsedEntry[] = [];

  for (const filePath of files.sort()) {
    const metadata = extractMetadata(filePath);
    if (!metadata) continue;

    const relPath = relative(sourceDir, filePath);
    const relativePath = relPath.replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
    const id = relativePath.replace(/[\/\\]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const importPath = `${config.importAlias}/${relativePath}`;
    const href = config.urlPrefix ? `${config.urlPrefix}/${relativePath}` : `/${relativePath}`;

    entries.push({
      id,
      filePath,
      relativePath,
      importPath,
      href,
      metadata,
    });
  }

  return entries;
}
