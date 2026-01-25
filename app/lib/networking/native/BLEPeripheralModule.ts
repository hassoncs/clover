import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { PeerId } from '../types';
import type { BLEPeripheralManager, PeripheralConfig, SessionInfo } from '../ble/BLEPeripheralManager';

const LINKING_ERROR =
  `The package 'BLEPeripheralModule' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (use development build)\n';

interface NativeBLEPeripheral {
  initialize(config: {
    serviceUuid: string;
    characteristics: Record<string, string>;
    deviceName: string;
    sessionInfo: string;
  }): Promise<void>;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  sendData(peerId: string, data: string): void;
  broadcastData(data: string): void;
  disconnectPeer(peerId: string): Promise<void>;
  disconnectAll(): Promise<void>;
  destroy(): Promise<void>;
}

const NativeBLEPeripheralModule: NativeBLEPeripheral | null =
  NativeModules.BLEPeripheralModule
    ? NativeModules.BLEPeripheralModule
    : null;

class NativeBLEPeripheralManager implements BLEPeripheralManager {
  private emitter: NativeEventEmitter | null = null;
  private config: PeripheralConfig | null = null;
  private subscriptions: Array<{ remove(): void }> = [];

  async initialize(config: PeripheralConfig): Promise<void> {
    if (!NativeBLEPeripheralModule) {
      throw new Error(LINKING_ERROR);
    }

    this.config = config;
    this.emitter = new NativeEventEmitter(NativeModules.BLEPeripheralModule);

    this.subscriptions.push(
      this.emitter.addListener('onClientConnected', (event: { clientId: string; clientName: string }) => {
        config.onClientConnected(event.clientId, event.clientName);
      })
    );

    this.subscriptions.push(
      this.emitter.addListener('onClientDisconnected', (event: { clientId: string }) => {
        config.onClientDisconnected(event.clientId);
      })
    );

    this.subscriptions.push(
      this.emitter.addListener('onDataReceived', (event: { clientId: string; data: string }) => {
        const bytes = this.base64ToBytes(event.data);
        config.onDataReceived(event.clientId, bytes);
      })
    );

    await NativeBLEPeripheralModule.initialize({
      serviceUuid: config.serviceUuid,
      characteristics: config.characteristics,
      deviceName: config.deviceName,
      sessionInfo: JSON.stringify(config.sessionInfo),
    });
  }

  async startAdvertising(): Promise<void> {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    await NativeBLEPeripheralModule.startAdvertising();
  }

  async stopAdvertising(): Promise<void> {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    await NativeBLEPeripheralModule.stopAdvertising();
  }

  sendToPeer(peerId: PeerId, chunks: Uint8Array[]): void {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    for (const chunk of chunks) {
      NativeBLEPeripheralModule.sendData(peerId, this.bytesToBase64(chunk));
    }
  }

  broadcastToAll(chunks: Uint8Array[]): void {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    for (const chunk of chunks) {
      NativeBLEPeripheralModule.broadcastData(this.bytesToBase64(chunk));
    }
  }

  async disconnectPeer(peerId: PeerId): Promise<void> {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    await NativeBLEPeripheralModule.disconnectPeer(peerId);
  }

  async disconnectAll(): Promise<void> {
    if (!NativeBLEPeripheralModule) throw new Error(LINKING_ERROR);
    await NativeBLEPeripheralModule.disconnectAll();
  }

  async destroy(): Promise<void> {
    for (const sub of this.subscriptions) {
      sub.remove();
    }
    this.subscriptions = [];
    this.emitter = null;

    if (NativeBLEPeripheralModule) {
      await NativeBLEPeripheralModule.destroy();
    }
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export function isNativeBLEPeripheralAvailable(): boolean {
  return NativeBLEPeripheralModule !== null;
}

export function createNativeBLEPeripheralManager(): BLEPeripheralManager {
  return new NativeBLEPeripheralManager();
}
