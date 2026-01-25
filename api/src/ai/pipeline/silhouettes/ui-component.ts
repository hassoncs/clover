import sharp from 'sharp';

export const UI_COMPONENT_MARGINS = {
  small: 8,
  medium: 12,
  large: 16,
} as const;

export type MarginSize = keyof typeof UI_COMPONENT_MARGINS;

export interface NinePatchSilhouetteParams {
  width: number;
  height: number;
  marginSize: number;
  canvasSize?: number;
}

/**
 * Creates a margin-guided silhouette for UI component generation.
 * 
 * The silhouette has:
 * - Outer border zone in dark gray (#404040) - fixed corners/edges for nine-patch
 * - Inner content zone in medium gray (#808080) - stretchable center
 * - White background (#FFFFFF)
 * 
 * This visual structure helps the AI understand where decorative borders
 * should go versus the stretchable center region.
 */
export async function createNinePatchSilhouette(params: NinePatchSilhouetteParams): Promise<Uint8Array> {
  const { width, height, marginSize, canvasSize = 256 } = params;
  
  const borderColor = { r: 64, g: 64, b: 64, alpha: 255 };
  const centerColor = { r: 128, g: 128, b: 128, alpha: 255 };
  const bgColor = { r: 255, g: 255, b: 255, alpha: 255 };
  
  const canvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bgColor,
    },
  });
  
  const x = Math.floor((canvasSize - width) / 2);
  const y = Math.floor((canvasSize - height) / 2);
  
  const outerRect = Buffer.alloc(width * height * 4);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4;
      outerRect[idx] = borderColor.r;
      outerRect[idx + 1] = borderColor.g;
      outerRect[idx + 2] = borderColor.b;
      outerRect[idx + 3] = borderColor.alpha;
    }
  }
  
  const innerWidth = Math.max(1, width - marginSize * 2);
  const innerHeight = Math.max(1, height - marginSize * 2);
  const innerRect = Buffer.alloc(innerWidth * innerHeight * 4);
  for (let py = 0; py < innerHeight; py++) {
    for (let px = 0; px < innerWidth; px++) {
      const idx = (py * innerWidth + px) * 4;
      innerRect[idx] = centerColor.r;
      innerRect[idx + 1] = centerColor.g;
      innerRect[idx + 2] = centerColor.b;
      innerRect[idx + 3] = centerColor.alpha;
    }
  }
  
  const result = await canvas
    .composite([
      {
        input: outerRect,
        raw: { width, height, channels: 4 },
        left: x,
        top: y,
      },
      {
        input: innerRect,
        raw: { width: innerWidth, height: innerHeight, channels: 4 },
        left: x + marginSize,
        top: y + marginSize,
      },
    ])
    .png()
    .toBuffer();
  
  return new Uint8Array(result);
}
