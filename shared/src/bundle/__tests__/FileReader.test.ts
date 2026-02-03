import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { NodeFileReader, VirtualFileReader } from '../FileReader';

describe('FileReader', () => {
  describe('NodeFileReader', () => {
    const reader = new NodeFileReader();

    it('should read a real file', () => {
      const packageJsonPath = path.resolve(__dirname, '../../../../package.json');
      expect(reader.existsSync(packageJsonPath)).toBe(true);
      const content = reader.readFileSync(packageJsonPath);
      const json = JSON.parse(content);
      expect(json.name).toBe('slopcade-monorepo');
    });

    it('should list directory contents', () => {
      const dirPath = path.resolve(__dirname, '..');
      const entries = reader.readdirSync(dirPath);
      expect(entries.some(e => e.name === 'compiler.ts')).toBe(true);
      expect(entries.some(e => e.name === 'FileReader.ts')).toBe(true);
    });

    it('should stat a file', () => {
      const packageJsonPath = path.resolve(__dirname, '../../../../package.json');
      const stat = reader.statSync(packageJsonPath);
      expect(stat.isFile()).toBe(true);
      expect(stat.isDirectory()).toBe(false);
    });

    it('should throw when reading non-existent file', () => {
      expect(() => reader.readFileSync('/non/existent/file')).toThrow();
    });
  });

  describe('VirtualFileReader', () => {
    const bundleRoot = '/app/bundle';
    const files = new Map([
      ['manifest.json', '{"name": "test"}'],
      ['entities/player.json', '{"id": "player"}'],
      ['entities/enemy.json', '{"id": "enemy"}'],
    ]);
    const reader = new VirtualFileReader(bundleRoot, files);

    it('should throw if bundleRoot is not absolute', () => {
      expect(() => new VirtualFileReader('relative/path', files)).toThrow('bundleRoot must be an absolute path');
    });

    it('should read virtual files using absolute paths', () => {
      const filePath = path.join(bundleRoot, 'manifest.json');
      expect(reader.existsSync(filePath)).toBe(true);
      expect(reader.readFileSync(filePath)).toBe('{"name": "test"}');
    });

    it('should read virtual files in subdirectories', () => {
      const filePath = path.join(bundleRoot, 'entities/player.json');
      expect(reader.existsSync(filePath)).toBe(true);
      expect(reader.readFileSync(filePath)).toBe('{"id": "player"}');
    });

    it('should return false for non-existent virtual files', () => {
      const filePath = path.join(bundleRoot, 'missing.json');
      expect(reader.existsSync(filePath)).toBe(false);
    });

    it('should list directory contents (root)', () => {
      const entries = reader.readdirSync(bundleRoot);
      expect(entries.length).toBe(2);
      expect(entries.find(e => e.name === 'manifest.json')?.isFile()).toBe(true);
      expect(entries.find(e => e.name === 'entities')?.isDirectory()).toBe(true);
    });

    it('should list directory contents (subdir)', () => {
      const dirPath = path.join(bundleRoot, 'entities');
      const entries = reader.readdirSync(dirPath);
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.isFile())).toBe(true);
      expect(entries.map(e => e.name)).toContain('player.json');
      expect(entries.map(e => e.name)).toContain('enemy.json');
    });

    it('should stat virtual files and directories', () => {
      const filePath = path.join(bundleRoot, 'manifest.json');
      const fileStat = reader.statSync(filePath);
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.isDirectory()).toBe(false);

      const dirPath = path.join(bundleRoot, 'entities');
      const dirStat = reader.statSync(dirPath);
      expect(dirStat.isFile()).toBe(false);
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('should throw when reading missing virtual file', () => {
      const filePath = path.join(bundleRoot, 'missing.json');
      expect(() => reader.readFileSync(filePath)).toThrow(`ENOENT: no such file: ${filePath}`);
    });

    it('should handle trailing slashes in bundleRoot', () => {
      const rootWithSlash = bundleRoot + '/';
      const reader2 = new VirtualFileReader(rootWithSlash, files);
      const filePath = path.join(bundleRoot, 'manifest.json');
      expect(reader2.readFileSync(filePath)).toBe('{"name": "test"}');
    });
  });
});
