import * as fs from 'fs';
import * as path from 'path';

export interface StatResult {
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface FileReader {
  readFileSync(filePath: string): string;
  existsSync(filePath: string): boolean;
  readdirSync(dir: string): Dirent[];
  statSync(path: string): StatResult;
}

export class NodeFileReader implements FileReader {
  readFileSync(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  readdirSync(dir: string): Dirent[] {
    return fs.readdirSync(dir, { withFileTypes: true }).map(dirent => ({
      name: dirent.name,
      isFile: () => dirent.isFile(),
      isDirectory: () => dirent.isDirectory(),
    }));
  }

  statSync(filePath: string): StatResult {
    const stats = fs.statSync(filePath);
    return {
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
    };
  }
}

export class VirtualFileReader implements FileReader {
  private files: Map<string, string>;
  private bundleRoot: string;

  constructor(bundleRoot: string, files: Map<string, string>) {
    if (!path.isAbsolute(bundleRoot)) {
      throw new Error('bundleRoot must be an absolute path');
    }
    this.bundleRoot = path.normalize(bundleRoot);
    this.files = new Map();
    for (const [key, value] of files) {
      this.files.set(path.normalize(key), value);
    }
  }

  private getRelativePath(absolutePath: string): string | null {
    const normalizedRoot = path.normalize(this.bundleRoot);
    const normalizedPath = path.normalize(absolutePath);
    
    if (!normalizedPath.startsWith(normalizedRoot)) {
      return null;
    }

    let relative = path.relative(normalizedRoot, normalizedPath);
    relative = relative.replace(/^[/\\]+/, '');
    return relative || '.';
  }

  readFileSync(filePath: string): string {
    const relPath = this.getRelativePath(filePath);
    if (relPath === null || !this.files.has(relPath)) {
      throw new Error(`ENOENT: no such file: ${filePath}`);
    }
    return this.files.get(relPath)!;
  }

  existsSync(filePath: string): boolean {
    const relPath = this.getRelativePath(filePath);
    if (relPath === null) return false;
    
    if (this.files.has(relPath)) return true;

    const dirPrefix = relPath === '.' ? '' : relPath + '/';
    for (const key of this.files.keys()) {
      if (key.startsWith(dirPrefix)) return true;
    }

    return false;
  }

  readdirSync(dir: string): Dirent[] {
    const relDir = this.getRelativePath(dir);
    if (relDir === null) {
      throw new Error(`ENOENT: no such directory: ${dir}`);
    }

    const dirPrefix = relDir === '.' ? '' : relDir + '/';
    const entries = new Map<string, { isFile: boolean; isDir: boolean }>();

    for (const key of this.files.keys()) {
      if (key.startsWith(dirPrefix)) {
        const remaining = key.slice(dirPrefix.length);
        if (remaining === '') continue;
        
        const parts = remaining.split('/');
        const name = parts[0];
        const isDir = parts.length > 1;
        
        const existing = entries.get(name);
        if (existing) {
          existing.isDir = existing.isDir || isDir;
          existing.isFile = existing.isFile || !isDir;
        } else {
          entries.set(name, { isFile: !isDir, isDir });
        }
      }
    }

    if (entries.size === 0 && relDir !== '.' && !this.existsSync(dir)) {
      throw new Error(`ENOENT: no such directory: ${dir}`);
    }

    return Array.from(entries.entries()).map(([name, info]) => ({
      name,
      isFile: () => info.isFile,
      isDirectory: () => info.isDir,
    }));
  }

  statSync(filePath: string): StatResult {
    const relPath = this.getRelativePath(filePath);
    if (relPath === null) {
      throw new Error(`ENOENT: no such file or directory: ${filePath}`);
    }

    if (this.files.has(relPath)) {
      return {
        isFile: () => true,
        isDirectory: () => false,
      };
    }

    const dirPrefix = relPath === '.' ? '' : relPath + path.sep;
    for (const key of this.files.keys()) {
      if (key.startsWith(dirPrefix)) {
        return {
          isFile: () => false,
          isDirectory: () => true,
        };
      }
    }

    throw new Error(`ENOENT: no such file or directory: ${filePath}`);
  }
}
