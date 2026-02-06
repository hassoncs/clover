import { describe, it, expect } from 'vitest';
import { resolveStyle, STYLE_PRESETS } from '@/ai/pipeline/types';

describe('resolveStyle', () => {
  describe('preset styles', () => {
    it('expands pixel preset to full descriptor', () => {
      const result = resolveStyle('pixel');
      expect(result).toBe(STYLE_PRESETS['pixel']);
      expect(result).toContain('pixel art');
    });

    it('expands 3d preset to full descriptor', () => {
      const result = resolveStyle('3d');
      expect(result).toBe(STYLE_PRESETS['3d']);
      expect(result).toContain('3D rendered');
    });

    it('expands cartoon preset to full descriptor', () => {
      const result = resolveStyle('cartoon');
      expect(result).toBe(STYLE_PRESETS['cartoon']);
      expect(result).toContain('cartoon illustration');
    });

    it('expands flat preset to full descriptor', () => {
      const result = resolveStyle('flat');
      expect(result).toBe(STYLE_PRESETS['flat']);
      expect(result).toContain('flat vector');
    });

    it('expands watercolor preset to full descriptor', () => {
      const result = resolveStyle('watercolor');
      expect(result).toBe(STYLE_PRESETS['watercolor']);
      expect(result).toContain('watercolor painting');
    });

    it('expands voxel preset to full descriptor', () => {
      const result = resolveStyle('voxel');
      expect(result).toBe(STYLE_PRESETS['voxel']);
      expect(result).toContain('voxel art');
    });

    it('expands low-poly preset to full descriptor', () => {
      const result = resolveStyle('low-poly');
      expect(result).toBe(STYLE_PRESETS['low-poly']);
      expect(result).toContain('low-poly 3D');
    });

    it('expands retro preset to full descriptor', () => {
      const result = resolveStyle('retro');
      expect(result).toBe(STYLE_PRESETS['retro']);
      expect(result).toContain('retro 16-bit');
    });

    it('expands sketch preset to full descriptor', () => {
      const result = resolveStyle('sketch');
      expect(result).toBe(STYLE_PRESETS['sketch']);
      expect(result).toContain('hand-drawn');
    });

    it('expands photorealistic preset to full descriptor', () => {
      const result = resolveStyle('photorealistic');
      expect(result).toBe(STYLE_PRESETS['photorealistic']);
      expect(result).toContain('photorealistic');
    });
  });

  describe('custom free-text styles', () => {
    it('returns custom style string as-is', () => {
      const customStyle = 'dreamy papercraft diorama';
      const result = resolveStyle(customStyle);
      expect(result).toBe(customStyle);
    });

    it('returns complex custom style string as-is', () => {
      const customStyle = 'hand-painted oil on canvas, impressionist style, vibrant colors';
      const result = resolveStyle(customStyle);
      expect(result).toBe(customStyle);
    });

    it('returns single-word custom style as-is', () => {
      const customStyle = 'cyberpunk';
      const result = resolveStyle(customStyle);
      expect(result).toBe(customStyle);
    });

    it('returns style with special characters as-is', () => {
      const customStyle = 'neo-gothic, dark & moody';
      const result = resolveStyle(customStyle);
      expect(result).toBe(customStyle);
    });
  });

  describe('edge cases', () => {
    it('returns empty string as-is', () => {
      const result = resolveStyle('');
      expect(result).toBe('');
    });

    it('returns whitespace-only string as-is', () => {
      const result = resolveStyle('   ');
      expect(result).toBe('   ');
    });

    it('is case-sensitive for preset keys', () => {
      const result = resolveStyle('PIXEL');
      expect(result).toBe('PIXEL');
      expect(result).not.toBe(STYLE_PRESETS['pixel']);
    });

    it('does not match partial preset keys', () => {
      const result = resolveStyle('pix');
      expect(result).toBe('pix');
      expect(result).not.toBe(STYLE_PRESETS['pixel']);
    });

    it('handles style with leading/trailing spaces', () => {
      const result = resolveStyle(' pixel ');
      expect(result).toBe(' pixel ');
      expect(result).not.toBe(STYLE_PRESETS['pixel']);
    });
  });
});
