import type { GridCell, GridSpec, LayoutDoc, TextAlignment, TextLine, WrapConfig } from '../types';

export const TEXT_GRID_LIMITS = {
  maxGraphemes: 256,
  maxGridCells: 1024,
} as const;

export type WordTokenKind = 'word' | 'whitespace' | 'other';

export interface WordToken {
  kind: WordTokenKind;
  text: string;
  graphemes: string[];
}

export function segmentGraphemes(text: string): string[] {
  // UAX #29 via standard JS API.
  // Locale should not materially affect grapheme segmentation, but pass a stable one.
  if (typeof Intl === 'undefined' || typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter !== 'function') {
    throw new Error('Intl.Segmenter is required for grapheme segmentation (UAX #29)');
  }

  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

function segmentWords(text: string): Array<{ segment: string; isWordLike: boolean } | { segment: string; isWordLike?: undefined }> {
  if (typeof Intl === 'undefined' || typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter !== 'function') {
    // If Intl.Segmenter is unavailable, fall back to a simple split. Grapheme fallback still works.
    return [{ segment: text }];
  }

  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  return Array.from(segmenter.segment(text), (s) => ({ segment: s.segment, isWordLike: s.isWordLike }));
}

function classifyToken(segment: string, isWordLike?: boolean): WordTokenKind {
  if (/^\s+$/.test(segment)) return 'whitespace';
  if (isWordLike) return 'word';
  return 'other';
}

export function tokenizeForWordWrap(text: string): WordToken[] {
  const raw = segmentWords(text);
  const tokens: WordToken[] = [];

  for (const s of raw) {
    const kind = classifyToken(s.segment, 'isWordLike' in s ? s.isWordLike : undefined);
    const prev = tokens.at(-1);
    if (kind === 'whitespace' && prev?.kind === 'whitespace') {
      prev.text += s.segment;
      prev.graphemes.push(...segmentGraphemes(s.segment));
      continue;
    }
    tokens.push({ kind, text: s.segment, graphemes: segmentGraphemes(s.segment) });
  }

  return tokens;
}

function enforceHardLimits(params: { text: string; grid: GridSpec }): void {
  const graphemes = segmentGraphemes(params.text).filter((g) => g !== '\n');
  if (graphemes.length > TEXT_GRID_LIMITS.maxGraphemes) {
    throw new Error(`Text grid hard limit exceeded: ${graphemes.length} graphemes (max ${TEXT_GRID_LIMITS.maxGraphemes})`);
  }

  const totalCells = params.grid.cols * params.grid.rows;
  if (totalCells > TEXT_GRID_LIMITS.maxGridCells) {
    throw new Error(`Text grid hard limit exceeded: grid has ${totalCells} cells (max ${TEXT_GRID_LIMITS.maxGridCells})`);
  }
}

function countPlacedGraphemes(doc: Pick<LayoutDoc, 'cells'>): number {
  return doc.cells.reduce((acc, c) => (c.g.length > 0 ? acc + 1 : acc), 0);
}

function computeLineStartCol(align: TextAlignment, cols: number, lineLen: number): number {
  if (lineLen >= cols) return 0;
  const slack = cols - lineLen;
  if (align === 'center') return Math.floor(slack / 2);
  if (align === 'right') return slack;
  return 0;
}

function splitByHardNewlines(text: string): string[] {
  // Preserve empty lines.
  return text.split('\n');
}

function wrapHardLineCharMode(text: string, cols: number): string[][] {
  const g = segmentGraphemes(text);
  if (g.length === 0) return [[]];
  const lines: string[][] = [];
  for (let i = 0; i < g.length; i += cols) {
    lines.push(g.slice(i, i + cols));
  }
  return lines;
}

function wrapHardLineWordMode(text: string, cols: number): string[][] {
  const tokens = tokenizeForWordWrap(text);
  const lines: string[][] = [];
  let current: string[] = [];

  const flush = () => {
    lines.push(current);
    current = [];
  };

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const remaining = cols - current.length;

    if (current.length === 0 && tok.kind === 'whitespace') {
      i++;
      continue;
    }

    if (tok.graphemes.length <= remaining) {
      current.push(...tok.graphemes);
      i++;
      continue;
    }

    if (tok.kind === 'whitespace') {
      // Don't carry trailing whitespace to the next line.
      flush();
      i++;
      continue;
    }

    if (current.length > 0) {
      flush();
      continue;
    }

    // Single token longer than the line: fall back to character breaks.
    for (let j = 0; j < tok.graphemes.length; j += cols) {
      lines.push(tok.graphemes.slice(j, j + cols));
    }
    i++;
  }

  flush();
  return lines;
}

function applyOverflowPolicy(params: {
  lines: string[][];
  cols: number;
  maxLines: number;
  overflow: WrapConfig['overflow'];
}): string[][] {
  const { lines, cols, maxLines, overflow } = params;
  if (lines.length <= maxLines) return lines;

  if (overflow === 'error') {
    throw new Error(`Text overflow: produced ${lines.length} lines, but grid allows ${maxLines}`);
  }

  const clipped = lines.slice(0, maxLines);
  if (overflow === 'truncate') return clipped;

  // ellipsis
  const ellipsis = '…';
  const lastIdx = clipped.length - 1;
  const last = clipped[lastIdx] ?? [];
  if (cols <= 0) return clipped;

  if (last.length < cols) {
    clipped[lastIdx] = [...last, ellipsis];
    return clipped;
  }
  clipped[lastIdx] = [...last.slice(0, Math.max(0, cols - 1)), ellipsis];
  return clipped;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const stringify = (v: unknown): string => {
    if (v === null) return 'null';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'undefined') return 'null';
    if (Array.isArray(v)) return `[${v.map(stringify).join(',')}]`;
    if (typeof v === 'object') {
      if (seen.has(v as object)) throw new Error('Cannot stableStringify circular structure');
      seen.add(v as object);
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${stringify(obj[k])}`).join(',')}}`;
    }
    return JSON.stringify(String(v));
  };

  return stringify(value);
}

function sha256Bytes(message: Uint8Array): Uint8Array {
  // Self-reference to satisfy some LSP unused heuristics.
  void sha256Bytes;
  // FIPS 180-4
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = message.length * 8;
  const withOne = message.length + 1;
  const padLen = (withOne % 64 <= 56 ? 56 - (withOne % 64) : 56 + 64 - (withOne % 64));
  const totalLen = withOne + padLen + 8;

  const padded = new Uint8Array(totalLen);
  padded.set(message);
  padded[message.length] = 0x80;

  // append length (big-endian) as 64-bit integer
  const hi = Math.floor(bitLen / 2 ** 32);
  const lo = bitLen >>> 0;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, hi, false);
  view.setUint32(totalLen - 4, lo, false);

  const w = new Uint32Array(64);

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z);
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z);
  const s0 = (x: number) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  const s1 = (x: number) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
  const S0 = (x: number) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  const S1 = (x: number) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (s1(w[i - 2]!) + w[i - 7]! + s0(w[i - 15]!) + w[i - 16]!) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const t1 = (h + S1(e) + ch(e, f, g) + K[i]! + w[i]!) >>> 0;
      const t2 = (S0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

export function makeCellId(row: number, col: number): string {
  return `cell_${row}_${col}`;
}

export function createLayoutDoc(params: { text: string; grid: GridSpec; wrap: WrapConfig }): LayoutDoc {
  const { text, grid, wrap } = params;

  enforceHardLimits({ text, grid });
  if (grid.cols <= 0 || grid.rows <= 0) {
    throw new Error(`Invalid grid: cols=${grid.cols}, rows=${grid.rows}`);
  }
  if (grid.maxLines <= 0) {
    throw new Error(`Invalid grid: maxLines=${grid.maxLines}`);
  }
  if (grid.maxLines > grid.rows) {
    throw new Error(`Invalid grid: maxLines (${grid.maxLines}) cannot exceed rows (${grid.rows})`);
  }

  const maxLines = Math.min(grid.maxLines, grid.rows);
  const hardLines = splitByHardNewlines(text);

  const wrapped: string[][] = [];
  for (const hl of hardLines) {
    if (wrap.mode === 'char') {
      wrapped.push(...wrapHardLineCharMode(hl, grid.cols));
      continue;
    }
    wrapped.push(...wrapHardLineWordMode(hl, grid.cols));
  }

  const finalLines = applyOverflowPolicy({ lines: wrapped, cols: grid.cols, maxLines, overflow: wrap.overflow });

  const cells: GridCell[] = [];
  const lines: TextLine[] = [];

  for (let row = 0; row < finalLines.length; row++) {
    const lineG = finalLines[row] ?? [];
    const startCol = computeLineStartCol(grid.align, grid.cols, lineG.length);
    const y = row * (grid.cellH + grid.lineGap);
    const baselineY = y + grid.cellH;

    let startCellId = makeCellId(row, 0);
    let endCellId = makeCellId(row, 0);

    for (let i = 0; i < lineG.length; i++) {
      const col = startCol + i;
      if (col >= grid.cols) break;
      const g = lineG[i] ?? '';
      const cellId = makeCellId(row, col);
      if (i === 0) startCellId = cellId;
      endCellId = cellId;

      cells.push({
        cellId,
        g,
        row,
        col,
        x: col * grid.cellW,
        y,
        w: grid.cellW,
        h: grid.cellH,
        visible: !/^\s+$/.test(g),
      });
    }

    if (lineG.length === 0) {
      // Keep start/end stable even for empty lines.
      startCellId = makeCellId(row, startCol);
      endCellId = startCellId;
    }

    lines.push({
      line: row,
      startCellId,
      endCellId,
      baselineY,
    });
  }

  const doc: LayoutDoc = {
    version: '1.0',
    text,
    grid,
    wrap,
    cells,
    lines,
    hashes: {},
  };

  const placed = countPlacedGraphemes(doc);
  if (placed > TEXT_GRID_LIMITS.maxGraphemes) {
    throw new Error(
      `Text grid hard limit exceeded: placed ${placed} graphemes into cells (max ${TEXT_GRID_LIMITS.maxGraphemes}); reduce text or grid/wrap settings`
    );
  }

  doc.hashes = computeLayoutDocHashes(doc);

  return doc;
}

export function computeLayoutDocHashes(doc: LayoutDoc): Record<string, string> {
  const inputs = { version: doc.version, text: doc.text, grid: doc.grid, wrap: doc.wrap };
  const layout = {
    cells: doc.cells.map((c) => ({ cellId: c.cellId, g: c.g, row: c.row, col: c.col, x: c.x, y: c.y, w: c.w, h: c.h, visible: c.visible })),
    lines: doc.lines,
  };

  const digestHex = (message: string): string => {
    const data = new TextEncoder().encode(message);
    const hash = sha256Bytes(data);
    return Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return {
    text: digestHex(doc.text),
    inputs: digestHex(stableStringify(inputs)),
    layout: digestHex(stableStringify(layout)),
  };
}
