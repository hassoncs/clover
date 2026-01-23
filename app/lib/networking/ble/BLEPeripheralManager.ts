import type { PeerId } from '../types';

export interface SessionInfo {
  gameId: string;
  sessionId: string;
  hostName: string;
  hostPeerId: PeerId;
}

export interface PeripheralConfig {
  serviceUuid: string;
  characteristics: Record<string, string>;
  deviceName: string;
  sessionInfo: SessionInfo;
  onClientConnected: (clientId: string, clientName: string) => void;
  onClientDisconnected: (clientId: string) => void;
  onDataReceived: (clientId: string, data: Uint8Array) => void;
}

export interface BLEPeripheralManager {
  initialize(config: PeripheralConfig): Promise<void>;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  sendToPeer(peerId: PeerId, chunks: Uint8Array[]): void;
  broadcastToAll(chunks: Uint8Array[]): void;
  disconnectPeer(peerId: PeerId): Promise<void>;
  disconnectAll(): Promise<void>;
  destroy(): Promise<void>;
}

class BLEPeripheralManagerStub implements BLEPeripheralManager {
  async initialize(_config: PeripheralConfig): Promise<void> {
    throw new Error(
      'BLEPeripheralManager requires native module implementation. ' +
        'See documentation for iOS (CoreBluetooth CBPeripheralManager) and ' +
        'Android (BluetoothGattServer) setup.'
    );
  }

  async startAdvertising(): Promise<void> {
    throw new Error('Not implemented - requires native module');
  }

  async stopAdvertising(): Promise<void> {
    throw new Error('Not implemented - requires native module');
  }

  sendToPeer(_peerId: PeerId, _chunks: Uint8Array[]): void {
    throw new Error('Not implemented - requires native module');
  }

  broadcastToAll(_chunks: Uint8Array[]): void {
    throw new Error('Not implemented - requires native module');
  }

  async disconnectPeer(_peerId: PeerId): Promise<void> {
    throw new Error('Not implemented - requires native module');
  }

  async disconnectAll(): Promise<void> {
    throw new Error('Not implemented - requires native module');
  }

  async destroy(): Promise<void> {
    throw new Error('Not implemented - requires native module');
  }
}

export function createBLEPeripheralManager(): BLEPeripheralManager {
  return new BLEPeripheralManagerStub();
}
