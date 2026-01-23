import { Platform, PermissionsAndroid } from 'react-native';
import type {
  NetworkTransport,
  TransportConfig,
  TransportEventHandlers,
  NetworkMessage,
  PeerId,
  PeerInfo,
} from '../types';
import { ConnectionState, SessionRole, MessageType } from '../types';
import { BLE_CONSTANTS } from './constants';
import { chunkMessage, ChunkReassembler } from './chunking';
import {
  createBLEPeripheralManager,
  type BLEPeripheralManager,
  type SessionInfo,
} from './BLEPeripheralManager';

interface BLEDevice {
  id: string;
  name: string | null;
  connect(options?: { timeout?: number }): Promise<BLEDevice>;
  isConnected(): Promise<boolean>;
  discoverAllServicesAndCharacteristics(): Promise<BLEDevice>;
  requestMTU(mtu: number): Promise<BLEDevice & { mtu: number }>;
  readCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<{ value: string | null }>;
  writeCharacteristicWithResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    value: string
  ): Promise<void>;
  monitorCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    callback: (
      error: Error | null,
      characteristic: { value: string | null } | null
    ) => void
  ): { remove(): void };
  cancelConnection(): Promise<void>;
  onDisconnected(callback: (error: Error | null) => void): { remove(): void };
}

interface BLEManager {
  onStateChange(
    callback: (state: string) => void,
    emitCurrentState: boolean
  ): { remove(): void };
  startDeviceScan(
    uuids: string[] | null,
    options: { allowDuplicates?: boolean },
    callback: (error: Error | null, device: BLEDevice | null) => void
  ): void;
  stopDeviceScan(): void;
  destroy(): void;
}

let BleManagerClass: (new () => BLEManager) | null = null;

async function loadBleManager(): Promise<BLEManager> {
  if (!BleManagerClass) {
    try {
      const module = await import('react-native-ble-plx');
      BleManagerClass = module.BleManager as unknown as new () => BLEManager;
    } catch {
      throw new Error(
        'react-native-ble-plx is not installed. Run: npm install react-native-ble-plx'
      );
    }
  }
  return new BleManagerClass();
}

export class BLETransport implements NetworkTransport {
  private manager: BLEManager | null = null;
  private peripheralManager: BLEPeripheralManager | null = null;
  private handlers: TransportEventHandlers | null = null;
  private config: TransportConfig | null = null;

  private _state: ConnectionState = ConnectionState.DISCONNECTED;
  private _role: SessionRole | null = null;
  private _localPeerId: PeerId;
  private _connectedPeers = new Map<
    PeerId,
    PeerInfo & { device?: BLEDevice }
  >();

  private messageIdCounter = 0;
  private sequenceCounter = 0;
  private reassemblers = new Map<PeerId, ChunkReassembler>();
  private negotiatedMtu: number = BLE_CONSTANTS.DEFAULT_MTU;
  private pingTimestamps = new Map<PeerId, number>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private monitorSubscriptions: Array<{ remove(): void }> = [];

  constructor() {
    this._localPeerId = this.generatePeerId();
  }

  get state(): ConnectionState {
    return this._state;
  }

  get role(): SessionRole | null {
    return this._role;
  }

  get localPeerId(): PeerId {
    return this._localPeerId;
  }

  get connectedPeers(): Map<PeerId, PeerInfo> {
    return new Map(
      Array.from(this._connectedPeers.entries()).map(([id, data]) => [
        id,
        { name: data.name, latency: data.latency, lastSeen: data.lastSeen },
      ])
    );
  }

  async initialize(handlers: TransportEventHandlers): Promise<void> {
    this.handlers = handlers;

    await this.requestPermissions();
    this.manager = await loadBleManager();

    await new Promise<void>((resolve, reject) => {
      const subscription = this.manager!.onStateChange((state) => {
        if (state === 'PoweredOn') {
          subscription.remove();
          resolve();
        } else if (state === 'PoweredOff' || state === 'Unauthorized') {
          subscription.remove();
          reject(new Error(`Bluetooth is ${state}`));
        }
      }, true);
    });

    this.setState(ConnectionState.DISCONNECTED);
  }

  async startHosting(config: TransportConfig): Promise<void> {
    this.config = config;
    this._role = SessionRole.HOST;
    this.setState(ConnectionState.ADVERTISING);

    this.peripheralManager = createBLEPeripheralManager();

    const sessionInfo: SessionInfo = {
      gameId: config.gameId,
      sessionId: config.sessionId || this.generateSessionId(),
      hostName: config.deviceName,
      hostPeerId: this._localPeerId,
    };

    await this.peripheralManager.initialize({
      serviceUuid: BLE_CONSTANTS.SERVICE_UUID,
      characteristics: BLE_CONSTANTS.CHARACTERISTICS,
      deviceName: config.deviceName,
      sessionInfo,
      onClientConnected: this.handleClientConnected.bind(this),
      onClientDisconnected: this.handleClientDisconnected.bind(this),
      onDataReceived: this.handleDataReceived.bind(this),
    });

    await this.peripheralManager.startAdvertising();
    this.startPingInterval();
  }

  async joinSession(config: TransportConfig): Promise<void> {
    this.config = config;
    this._role = SessionRole.CLIENT;
    this.setState(ConnectionState.SCANNING);

    const hostDevice = await this.scanForHost(config.gameId, config.sessionId);

    if (!hostDevice) {
      throw new Error('No host found');
    }

    this.setState(ConnectionState.CONNECTING);
    await this.connectToHost(hostDevice);
    this.startPingInterval();
  }

  async disconnect(): Promise<void> {
    this.stopPingInterval();
    this.cleanupSubscriptions();

    if (this._role === SessionRole.HOST && this.peripheralManager) {
      await this.peripheralManager.stopAdvertising();
      await this.peripheralManager.disconnectAll();
    } else {
      for (const [, peerData] of this._connectedPeers) {
        if (peerData.device) {
          await peerData.device.cancelConnection().catch(() => {});
        }
      }
    }

    this._connectedPeers.clear();
    this.reassemblers.clear();
    this._role = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  async destroy(): Promise<void> {
    await this.disconnect();

    if (this.peripheralManager) {
      await this.peripheralManager.destroy();
      this.peripheralManager = null;
    }

    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
  }

  send(message: NetworkMessage, toPeerId: PeerId): void {
    const peerData = this._connectedPeers.get(toPeerId);
    if (!peerData) {
      console.warn(`Cannot send to unknown peer: ${toPeerId}`);
      return;
    }

    message.senderId = this._localPeerId;
    message.sequence = this.sequenceCounter++;

    const data = this.encodeMessage(message);
    const chunks = chunkMessage(
      data,
      this.messageIdCounter++ % 256,
      this.negotiatedMtu - 3
    );

    if (this._role === SessionRole.HOST && this.peripheralManager) {
      this.peripheralManager.sendToPeer(toPeerId, chunks);
    } else if (peerData.device) {
      this.writeToDevice(peerData.device, chunks);
    }
  }

  broadcast(message: NetworkMessage): void {
    for (const peerId of this._connectedPeers.keys()) {
      this.send({ ...message }, peerId);
    }
  }

  getLatency(peerId: PeerId): number {
    return this._connectedPeers.get(peerId)?.latency ?? 0;
  }

  private async scanForHost(
    gameId: string,
    sessionId?: string
  ): Promise<BLEDevice | null> {
    if (!this.manager) throw new Error('BLE Manager not initialized');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager!.stopDeviceScan();
        resolve(null);
      }, BLE_CONSTANTS.SCAN_DURATION_MS);

      const foundDevices = new Map<string, BLEDevice>();

      this.manager!.startDeviceScan(
        [BLE_CONSTANTS.SERVICE_UUID],
        { allowDuplicates: false },
        async (error, device) => {
          if (error) {
            clearTimeout(timeout);
            this.manager!.stopDeviceScan();
            reject(error);
            return;
          }

          if (device && !foundDevices.has(device.id)) {
            foundDevices.set(device.id, device);

            const sessionInfo = await this.readSessionInfo(device).catch(() => null);
            if (!sessionInfo) return;

            if (sessionInfo.gameId === gameId) {
              if (!sessionId || sessionInfo.sessionId === sessionId) {
                clearTimeout(timeout);
                this.manager!.stopDeviceScan();
                resolve(device);
              }
            }
          }
        }
      );
    });
  }

  private async connectToHost(device: BLEDevice): Promise<void> {
    const connectedDevice = await device.connect({
      timeout: BLE_CONSTANTS.CONNECTION_TIMEOUT_MS,
    });

    await connectedDevice.discoverAllServicesAndCharacteristics();

    if (Platform.OS === 'android') {
      const mtuDevice = await connectedDevice.requestMTU(BLE_CONSTANTS.MAX_MTU);
      this.negotiatedMtu = mtuDevice.mtu;
    } else {
      this.negotiatedMtu = 185;
    }

    const sessionInfo = await this.readSessionInfo(connectedDevice);

    const gameStateSub = connectedDevice.monitorCharacteristicForService(
      BLE_CONSTANTS.SERVICE_UUID,
      BLE_CONSTANTS.CHARACTERISTICS.GAME_STATE,
      (error, characteristic) => {
        if (!error && characteristic?.value) {
          const data = this.base64ToBytes(characteristic.value);
          this.handleDataReceived(sessionInfo.hostPeerId, data);
        }
      }
    );
    this.monitorSubscriptions.push(gameStateSub);

    const controlSub = connectedDevice.monitorCharacteristicForService(
      BLE_CONSTANTS.SERVICE_UUID,
      BLE_CONSTANTS.CHARACTERISTICS.CONTROL,
      (error, characteristic) => {
        if (!error && characteristic?.value) {
          const data = this.base64ToBytes(characteristic.value);
          this.handleDataReceived(sessionInfo.hostPeerId, data);
        }
      }
    );
    this.monitorSubscriptions.push(controlSub);

    this._connectedPeers.set(sessionInfo.hostPeerId, {
      name: sessionInfo.hostName,
      latency: 0,
      lastSeen: Date.now(),
      device: connectedDevice,
    });

    const disconnectSub = connectedDevice.onDisconnected((error) => {
      this.handleDisconnection(sessionInfo.hostPeerId, error);
    });
    this.monitorSubscriptions.push(disconnectSub);

    await this.sendHandshake(sessionInfo.hostPeerId);

    this.setState(ConnectionState.CONNECTED);
    this.handlers?.onPeerConnected(sessionInfo.hostPeerId, sessionInfo.hostName);
  }

  private async readSessionInfo(device: BLEDevice): Promise<SessionInfo> {
    const wasConnected = await device.isConnected();
    if (!wasConnected) {
      await device.connect({ timeout: 5000 });
      await device.discoverAllServicesAndCharacteristics();
    }

    const characteristic = await device.readCharacteristicForService(
      BLE_CONSTANTS.SERVICE_UUID,
      BLE_CONSTANTS.CHARACTERISTICS.SESSION_INFO
    );

    if (!wasConnected) {
      await device.cancelConnection();
    }

    if (!characteristic.value) {
      throw new Error('No session info available');
    }

    const data = this.base64ToBytes(characteristic.value);
    return JSON.parse(new TextDecoder().decode(data));
  }

  private async writeToDevice(
    device: BLEDevice,
    chunks: Uint8Array[]
  ): Promise<void> {
    for (const chunk of chunks) {
      await device.writeCharacteristicWithResponseForService(
        BLE_CONSTANTS.SERVICE_UUID,
        BLE_CONSTANTS.CHARACTERISTICS.PLAYER_INPUT,
        this.bytesToBase64(chunk)
      );
    }
  }

  private handleClientConnected(clientId: string, clientName: string): void {
    this._connectedPeers.set(clientId, {
      name: clientName,
      latency: 0,
      lastSeen: Date.now(),
    });
    this.reassemblers.set(clientId, new ChunkReassembler());
    this.handlers?.onPeerConnected(clientId, clientName);
    this.setState(ConnectionState.CONNECTED);
  }

  private handleClientDisconnected(clientId: string): void {
    this._connectedPeers.delete(clientId);
    this.reassemblers.delete(clientId);
    this.handlers?.onPeerDisconnected(clientId, 'disconnected');

    if (this._connectedPeers.size === 0 && this._role === SessionRole.HOST) {
      this.setState(ConnectionState.ADVERTISING);
    }
  }

  private handleDataReceived(fromPeerId: PeerId, data: Uint8Array): void {
    let reassembler = this.reassemblers.get(fromPeerId);
    if (!reassembler) {
      reassembler = new ChunkReassembler();
      this.reassemblers.set(fromPeerId, reassembler);
    }

    const complete = reassembler.addChunk(data);
    if (complete) {
      const message = this.decodeMessage(complete);
      this.handleMessage(message, fromPeerId);
    }
  }

  private handleMessage(message: NetworkMessage, fromPeerId: PeerId): void {
    const peerData = this._connectedPeers.get(fromPeerId);
    if (peerData) {
      peerData.lastSeen = Date.now();
    }

    if (message.type === MessageType.PING) {
      this.send(
        { ...message, type: MessageType.PONG } as NetworkMessage,
        fromPeerId
      );
      return;
    }

    if (message.type === MessageType.PONG) {
      const sentAt = this.pingTimestamps.get(fromPeerId);
      if (sentAt && peerData) {
        const latency = Date.now() - sentAt;
        peerData.latency = peerData.latency * 0.8 + latency * 0.2;
      }
      return;
    }

    this.handlers?.onMessage(message, fromPeerId);
  }

  private handleDisconnection(peerId: PeerId, error: Error | null): void {
    this._connectedPeers.delete(peerId);
    this.reassemblers.delete(peerId);
    this.handlers?.onPeerDisconnected(peerId, error?.message || 'Connection lost');

    if (this._role === SessionRole.CLIENT) {
      this.setState(ConnectionState.DISCONNECTED);
    }
  }

  private async sendHandshake(toPeerId: PeerId): Promise<void> {
    const message: NetworkMessage & { deviceName: string; gameVersion: string } = {
      type: MessageType.HANDSHAKE_REQUEST,
      timestamp: Date.now(),
      sequence: 0,
      senderId: this._localPeerId,
      deviceName: this.config!.deviceName,
      gameVersion: this.config!.gameVersion || '1.0.0',
    };
    this.send(message, toPeerId);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const peerId of this._connectedPeers.keys()) {
        this.pingTimestamps.set(peerId, Date.now());
        this.send(
          {
            type: MessageType.PING,
            timestamp: Date.now(),
            sequence: 0,
            senderId: this._localPeerId,
          },
          peerId
        );
      }
    }, BLE_CONSTANTS.PING_INTERVAL_MS);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private cleanupSubscriptions(): void {
    for (const sub of this.monitorSubscriptions) {
      sub.remove();
    }
    this.monitorSubscriptions = [];
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    this.handlers?.onStateChange(state);
  }

  private generatePeerId(): PeerId {
    return `ble-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private encodeMessage(message: NetworkMessage): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(message));
  }

  private decodeMessage(data: Uint8Array): NetworkMessage {
    return JSON.parse(new TextDecoder().decode(data));
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

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;

      if (typeof apiLevel === 'number' && apiLevel >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          throw new Error('Bluetooth permissions not granted');
        }
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Location permission not granted');
        }
      }
    }
  }
}
