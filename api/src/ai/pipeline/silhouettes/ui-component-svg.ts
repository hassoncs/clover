import sharp from 'sharp';

export interface PanelSilhouetteParams {
  width: number;
  height: number;
  margin: number;
}

export async function createPanelSilhouette(params: PanelSilhouetteParams): Promise<Uint8Array> {
  const { width, height, margin } = params;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" d="
        M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z
        M ${margin} ${margin} L ${width - margin} ${margin} L ${width - margin} ${height - margin} L ${margin} ${height - margin} Z
      " fill="#404040" />
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(buffer);
}

export interface ProgressBarSilhouetteParams {
  width: number;
  height: number;
}

export async function createProgressBarSilhouette(params: ProgressBarSilhouetteParams): Promise<Uint8Array> {
  const { width, height } = params;
  const barHeight = Math.floor(height / 2);
  const yOffset = Math.floor((height - barHeight) / 2);
  const borderRadius = 8;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${yOffset}" width="${width}" height="${barHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#606060" />
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(buffer);
}

export interface ScrollBarSilhouetteParams {
  orientation: 'h' | 'v';
}

export async function createScrollBarSilhouette(params: ScrollBarSilhouetteParams): Promise<Uint8Array> {
  const { orientation } = params;

  let svg: string;
  if (orientation === 'h') {
    const width = 256;
    const height = 32;
    const trackHeight = 24;
    const yOffset = Math.floor((height - trackHeight) / 2);

    svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${yOffset}" width="${width}" height="${trackHeight}" rx="4" ry="4" fill="#606060" />
      </svg>
    `;
  } else {
    const width = 32;
    const height = 256;
    const trackWidth = 24;
    const xOffset = Math.floor((width - trackWidth) / 2);

    svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${xOffset}" y="0" width="${trackWidth}" height="${height}" rx="4" ry="4" fill="#606060" />
      </svg>
    `;
  }

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(buffer);
}

export interface TabBarSilhouetteParams {
  width: number;
  height: number;
}

export async function createTabBarSilhouette(params: TabBarSilhouetteParams): Promise<Uint8Array> {
  const { width, height } = params;
  const radius = 8;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="
        M ${radius} 0
        L ${width - radius} 0
        Q ${width} 0 ${width} ${radius}
        L ${width} ${height}
        L 0 ${height}
        L 0 ${radius}
        Q 0 0 ${radius} 0
      " fill="#606060" />
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Uint8Array(buffer);
}
