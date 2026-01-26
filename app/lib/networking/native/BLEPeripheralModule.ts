import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { PeerId } from '../types';
import type { BLEPeripheralManager, PeripheralConfig, SessionInfo } from '../ble/BLEPeripheralManager';

const LINKING_ERROR =
  `The package 'BLEPeripheralModule' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (use development build)\n';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
}

function validateConfig(config: PeripheralConfig): void {
  if (!config.serviceUuid || !isValidUUID(config.serviceUuid)) {
    throw new Error(`Invalid service UUID: ${config.serviceUuid}`);
  }

  if (!config.characteristics || typeof config.characteristics !== 'object') {
    throw new Error('Characteristics must be an object');
  }

  const requiredCharacteristics = ['GAME_STATE', 'PLAYER_INPUT', 'SESSION_INFO', 'CONTROL'];
  for (const key of requiredCharacteristics) {
    const uuid = config.characteristics[key];
    if (!uuid || !isValidUUID(uuid)) {
      throw new Error(`Invalid ${key} characteristic UUID: ${uuid}`);
    }
  }

  if (!config.deviceName || typeof config.deviceName !== 'string' || config.deviceName.trim().length === 0) {
    throw new Error('Device name must be a non-empty string');
  }

  if (!config.sessionInfo || typeof config.sessionInfo !== 'object') {
    throw new Error('Session info must be an object');
  }
}

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

    validateConfig(config);

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
