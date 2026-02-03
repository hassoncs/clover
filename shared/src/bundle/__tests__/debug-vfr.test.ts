import { describe, it, expect } from 'vitest';
import { VirtualFileReader } from '../FileReader';
import * as path from 'path';

describe('VirtualFileReader Debug', () => {
  it('can find files in assets directory', () => {
    const files = new Map<string, string>([
      ['assets/ball.png', 'fake-image-data'],
    ]);

    const fileReader = new VirtualFileReader('/bundle', files);
    
    const assetPath = path.join('/bundle', 'assets', 'ball.png');
    console.log('Checking path:', assetPath);
    console.log('Exists:', fileReader.existsSync(assetPath));
    
    expect(fileReader.existsSync(assetPath)).toBe(true);
  });
});
