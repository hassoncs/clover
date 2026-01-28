import sharp from "sharp";
import path from "path";
import fs from "fs";

export interface FilmstripFrame {
  imagePath: string;
  frameNumber: number;
}

export interface FilmstripOptions {
  frames: FilmstripFrame[];
  outputPath: string;
  showLabels?: boolean;
  labelHeight?: number;
  maxWidth?: number;
  gap?: number;
}

export interface FilmstripResult {
  path: string;
  width: number;
  height: number;
  frameCount: number;
}

export async function createFilmstrip(options: FilmstripOptions): Promise<FilmstripResult> {
  const {
    frames,
    outputPath,
    showLabels = true,
    labelHeight = 30,
    maxWidth = 4000,
    gap = 4,
  } = options;

  if (frames.length === 0) {
    throw new Error("No frames provided for filmstrip");
  }

  const frameImages = await Promise.all(
    frames.map(async (frame) => {
      const metadata = await sharp(frame.imagePath).metadata();
      return {
        path: frame.imagePath,
        frameNumber: frame.frameNumber,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      };
    })
  );

  const firstFrame = frameImages[0];
  const frameWidth = firstFrame.width;
  const frameHeight = firstFrame.height;

  const totalGaps = (frames.length - 1) * gap;
  let naturalWidth = frames.length * frameWidth + totalGaps;
  let scale = 1;

  if (naturalWidth > maxWidth) {
    scale = maxWidth / naturalWidth;
  }

  const scaledFrameWidth = Math.floor(frameWidth * scale);
  const scaledFrameHeight = Math.floor(frameHeight * scale);
  const scaledGap = Math.floor(gap * scale);

  const totalWidth = frames.length * scaledFrameWidth + (frames.length - 1) * scaledGap;
  const totalHeight = scaledFrameHeight + (showLabels ? labelHeight : 0);

  const compositeInputs: sharp.OverlayOptions[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frameImages[i];
    const xOffset = i * (scaledFrameWidth + scaledGap);

    const resizedFrame = await sharp(frame.path)
      .resize(scaledFrameWidth, scaledFrameHeight, { fit: "fill" })
      .toBuffer();

    compositeInputs.push({
      input: resizedFrame,
      left: xOffset,
      top: showLabels ? labelHeight : 0,
    });

    if (showLabels) {
      const labelSvg = `
        <svg width="${scaledFrameWidth}" height="${labelHeight}">
          <rect width="100%" height="100%" fill="#1a1a1a"/>
          <text 
            x="50%" 
            y="50%" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            fill="white" 
            font-family="Arial, sans-serif" 
            font-size="14" 
            font-weight="bold"
          >Frame ${frame.frameNumber}</text>
        </svg>
      `;

      compositeInputs.push({
        input: Buffer.from(labelSvg),
        left: xOffset,
        top: 0,
      });
    }
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toFile(outputPath);

  return {
    path: outputPath,
    width: totalWidth,
    height: totalHeight,
    frameCount: frames.length,
  };
}
