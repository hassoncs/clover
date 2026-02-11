type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface WorkspaceReadResult {
  files: WorkspaceFile[];
  errors: string[];
}

export class R2WorkspaceReader {
  constructor(private readonly bucket: R2Bucket) {}

  async listFiles(gameId: string): Promise<string[]> {
    const prefix = `games/${gameId}/workspace/`;
    const paths: string[] = [];
    let cursor: string | undefined;

    do {
      const listed = await this.bucket.list({
        prefix,
        cursor,
      });

      for (const obj of listed.objects) {
        const relativePath = obj.key.slice(prefix.length);
        if (relativePath) {
          paths.push(relativePath);
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    return paths;
  }

  async readFile(gameId: string, filePath: string): Promise<string | null> {
    const key = `games/${gameId}/workspace/${filePath}`;
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return await obj.text();
  }

  async readAllFiles(gameId: string): Promise<WorkspaceReadResult> {
    const files: WorkspaceFile[] = [];
    const errors: string[] = [];

    const paths = await this.listFiles(gameId);

    for (const filePath of paths) {
      try {
        const content = await this.readFile(gameId, filePath);
        if (content !== null) {
          files.push({ path: filePath, content });
        } else {
          errors.push(`File listed but not readable: ${filePath}`);
        }
      } catch (err) {
        errors.push(`Failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { files, errors };
  }
}
