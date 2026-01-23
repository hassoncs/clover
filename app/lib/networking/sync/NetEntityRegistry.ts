import type { NetEntityId, PeerId } from '../types';

export interface NetEntityRecord {
  netEntityId: NetEntityId;
  localEntityId: string;
  bodyId: number;
  templateId: string;
  ownerPeerId?: PeerId;
  createdAt: number;
}

export class NetEntityRegistry {
  private byNetEntityId = new Map<NetEntityId, NetEntityRecord>();
  private byLocalEntityId = new Map<string, NetEntityRecord>();
  private byBodyId = new Map<number, NetEntityRecord>();
  private nextNetEntityId = 1;
  private localPeerId: PeerId;

  constructor(localPeerId: PeerId) {
    this.localPeerId = localPeerId;
  }

  register(
    localEntityId: string,
    bodyId: number,
    templateId: string,
    ownerPeerId?: PeerId,
    existingNetEntityId?: NetEntityId
  ): NetEntityRecord {
    const netEntityId =
      existingNetEntityId ?? this.generateNetEntityId();

    const record: NetEntityRecord = {
      netEntityId,
      localEntityId,
      bodyId,
      templateId,
      ownerPeerId,
      createdAt: Date.now(),
    };

    this.byNetEntityId.set(netEntityId, record);
    this.byLocalEntityId.set(localEntityId, record);
    this.byBodyId.set(bodyId, record);

    return record;
  }

  unregister(netEntityId: NetEntityId): NetEntityRecord | null {
    const record = this.byNetEntityId.get(netEntityId);
    if (!record) return null;

    this.byNetEntityId.delete(netEntityId);
    this.byLocalEntityId.delete(record.localEntityId);
    this.byBodyId.delete(record.bodyId);

    return record;
  }

  unregisterByLocalId(localEntityId: string): NetEntityRecord | null {
    const record = this.byLocalEntityId.get(localEntityId);
    if (!record) return null;
    return this.unregister(record.netEntityId);
  }

  getByNetEntityId(netEntityId: NetEntityId): NetEntityRecord | null {
    return this.byNetEntityId.get(netEntityId) ?? null;
  }

  getByLocalEntityId(localEntityId: string): NetEntityRecord | null {
    return this.byLocalEntityId.get(localEntityId) ?? null;
  }

  getByBodyId(bodyId: number): NetEntityRecord | null {
    return this.byBodyId.get(bodyId) ?? null;
  }

  getAllRecords(): NetEntityRecord[] {
    return Array.from(this.byNetEntityId.values());
  }

  getOwnedEntities(peerId: PeerId): NetEntityRecord[] {
    return this.getAllRecords().filter((r) => r.ownerPeerId === peerId);
  }

  getLocalOwnedEntities(): NetEntityRecord[] {
    return this.getOwnedEntities(this.localPeerId);
  }

  clear(): void {
    this.byNetEntityId.clear();
    this.byLocalEntityId.clear();
    this.byBodyId.clear();
  }

  private generateNetEntityId(): NetEntityId {
    return `${this.localPeerId}-${this.nextNetEntityId++}`;
  }
}
