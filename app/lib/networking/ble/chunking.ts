export interface ChunkHeader {
  messageId: number;
  chunkIndex: number;
  totalChunks: number;
  isLast: boolean;
}

export function encodeChunkHeader(header: ChunkHeader): Uint8Array {
  const bytes = new Uint8Array(3);
  bytes[0] = header.messageId & 0xff;
  bytes[1] = header.chunkIndex & 0xff;
  bytes[2] = (header.totalChunks & 0x7f) | (header.isLast ? 0x80 : 0);
  return bytes;
}

export function decodeChunkHeader(bytes: Uint8Array): ChunkHeader {
  return {
    messageId: bytes[0],
    chunkIndex: bytes[1],
    totalChunks: bytes[2] & 0x7f,
    isLast: (bytes[2] & 0x80) !== 0,
  };
}

export function chunkMessage(
  data: Uint8Array,
  messageId: number,
  maxChunkSize: number
): Uint8Array[] {
  const payloadSize = maxChunkSize - 3;
  const totalChunks = Math.ceil(data.length / payloadSize);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * payloadSize;
    const end = Math.min(start + payloadSize, data.length);
    const payload = data.slice(start, end);

    const header = encodeChunkHeader({
      messageId,
      chunkIndex: i,
      totalChunks,
      isLast: i === totalChunks - 1,
    });

    const chunk = new Uint8Array(header.length + payload.length);
    chunk.set(header, 0);
    chunk.set(payload, header.length);
    chunks.push(chunk);
  }

  return chunks;
}

export class ChunkReassembler {
  private pending = new Map<
    number,
    {
      chunks: Map<number, Uint8Array>;
      totalChunks: number;
      receivedAt: number;
    }
  >();

  private readonly TIMEOUT_MS = 5000;

  addChunk(data: Uint8Array): Uint8Array | null {
    const header = decodeChunkHeader(data);
    const payload = data.slice(3);

    this.cleanupStale();

    let pending = this.pending.get(header.messageId);
    if (!pending) {
      pending = {
        chunks: new Map(),
        totalChunks: header.totalChunks,
        receivedAt: Date.now(),
      };
      this.pending.set(header.messageId, pending);
    }

    pending.chunks.set(header.chunkIndex, payload);

    if (pending.chunks.size === pending.totalChunks) {
      const totalSize = Array.from(pending.chunks.values()).reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const complete = new Uint8Array(totalSize);

      let offset = 0;
      for (let i = 0; i < pending.totalChunks; i++) {
        const chunk = pending.chunks.get(i)!;
        complete.set(chunk, offset);
        offset += chunk.length;
      }

      this.pending.delete(header.messageId);
      return complete;
    }

    return null;
  }

  private cleanupStale(): void {
    const now = Date.now();
    for (const [messageId, pending] of this.pending) {
      if (now - pending.receivedAt > this.TIMEOUT_MS) {
        this.pending.delete(messageId);
      }
    }
  }

  reset(): void {
    this.pending.clear();
  }
}
