import Foundation
import CoreBluetooth
import React

@objc(BLEPeripheralModule)
class BLEPeripheralModule: RCTEventEmitter, CBPeripheralManagerDelegate {
  
  private var peripheralManager: CBPeripheralManager?
  private var service: CBMutableService?
  private var gameStateCharacteristic: CBMutableCharacteristic?
  private var playerInputCharacteristic: CBMutableCharacteristic?
  private var sessionInfoCharacteristic: CBMutableCharacteristic?
  private var controlCharacteristic: CBMutableCharacteristic?
  
  private var connectedCentrals: [UUID: CBCentral] = [:]
  private var centralNames: [UUID: String] = [:]
  private var sessionInfo: String = ""
  private var serviceUuid: String = ""
  private var characteristics: [String: String] = [:]
  private var isAdvertising = false
  private var hasListeners = false
  
  private var initializeResolver: RCTPromiseResolveBlock?
  private var initializeRejecter: RCTPromiseRejectBlock?
  
  override init() {
    super.init()
  }
  
  override static func moduleName() -> String! {
    return "BLEPeripheralModule"
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return ["onClientConnected", "onClientDisconnected", "onDataReceived", "onStateChange"]
  }
  
  override func startObserving() {
    hasListeners = true
  }
  
  override func stopObserving() {
    hasListeners = false
  }
  
  @objc
  func initialize(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let serviceUuid = config["serviceUuid"] as? String,
          let characteristics = config["characteristics"] as? [String: String],
          let sessionInfoJson = config["sessionInfo"] as? String else {
      reject("INVALID_CONFIG", "Missing required config fields", nil)
      return
    }
    
    self.serviceUuid = serviceUuid
    self.characteristics = characteristics
    self.sessionInfo = sessionInfoJson
    
    initializeResolver = resolve
    initializeRejecter = reject
    
    peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: [
      CBPeripheralManagerOptionShowPowerAlertKey: true
    ])
  }
  
  @objc
  func startAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let peripheralManager = peripheralManager else {
      reject("NOT_INITIALIZED", "Call initialize first", nil)
      return
    }
    
    guard peripheralManager.state == .poweredOn else {
      reject("BLUETOOTH_OFF", "Bluetooth is not powered on", nil)
      return
    }
    
    let advertisementData: [String: Any] = [
      CBAdvertisementDataLocalNameKey: "Slopcade",
      CBAdvertisementDataServiceUUIDsKey: [CBUUID(string: serviceUuid)]
    ]
    
    peripheralManager.startAdvertising(advertisementData)
    isAdvertising = true
    resolve(nil)
  }
  
  @objc
  func stopAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    peripheralManager?.stopAdvertising()
    isAdvertising = false
    resolve(nil)
  }
  
  @objc
  func sendData(_ peerId: String, data: String) {
    guard let peripheralManager = peripheralManager,
          let gameStateCharacteristic = gameStateCharacteristic,
          let uuid = UUID(uuidString: peerId),
          let central = connectedCentrals[uuid] else {
      return
    }
    
    guard let dataBytes = Data(base64Encoded: data) else {
      return
    }
    
    let success = peripheralManager.updateValue(dataBytes, for: gameStateCharacteristic, onSubscribedCentrals: [central])
    if !success {
      print("[BLEPeripheralModule] Failed to send data to \(peerId), queue full")
    }
  }
  
  @objc
  func broadcastData(_ data: String) {
    guard let peripheralManager = peripheralManager,
          let gameStateCharacteristic = gameStateCharacteristic else {
      return
    }
    
    guard let dataBytes = Data(base64Encoded: data) else {
      return
    }
    
    let centrals = Array(connectedCentrals.values)
    if centrals.isEmpty {
      return
    }
    
    let success = peripheralManager.updateValue(dataBytes, for: gameStateCharacteristic, onSubscribedCentrals: centrals)
    if !success {
      print("[BLEPeripheralModule] Failed to broadcast data, queue full")
    }
  }
  
  @objc
  func disconnectPeer(_ peerId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let uuid = UUID(uuidString: peerId) else {
      reject("INVALID_PEER_ID", "Invalid peer ID format", nil)
      return
    }
    
    connectedCentrals.removeValue(forKey: uuid)
    centralNames.removeValue(forKey: uuid)
    
    if hasListeners {
      sendEvent(withName: "onClientDisconnected", body: ["clientId": peerId])
    }
    
    resolve(nil)
  }
  
  @objc
  func disconnectAll(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let peerIds = connectedCentrals.keys.map { $0.uuidString }
    connectedCentrals.removeAll()
    centralNames.removeAll()
    
    if hasListeners {
      for peerId in peerIds {
        sendEvent(withName: "onClientDisconnected", body: ["clientId": peerId])
      }
    }
    
    resolve(nil)
  }
  
  @objc
  func destroy(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    peripheralManager?.stopAdvertising()
    
    if let service = service {
      peripheralManager?.remove(service)
    }
    
    connectedCentrals.removeAll()
    centralNames.removeAll()
    peripheralManager = nil
    service = nil
    gameStateCharacteristic = nil
    playerInputCharacteristic = nil
    sessionInfoCharacteristic = nil
    controlCharacteristic = nil
    
    resolve(nil)
  }
  
  // MARK: - CBPeripheralManagerDelegate
  
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      setupService()
      initializeResolver?(nil)
      initializeResolver = nil
      initializeRejecter = nil
      
    case .poweredOff:
      initializeRejecter?("BLUETOOTH_OFF", "Bluetooth is powered off", nil)
      initializeResolver = nil
      initializeRejecter = nil
      
    case .unauthorized:
      initializeRejecter?("UNAUTHORIZED", "Bluetooth permission not granted", nil)
      initializeResolver = nil
      initializeRejecter = nil
      
    case .unsupported:
      initializeRejecter?("UNSUPPORTED", "BLE peripheral mode not supported", nil)
      initializeResolver = nil
      initializeRejecter = nil
      
    default:
      break
    }
    
    if hasListeners {
      sendEvent(withName: "onStateChange", body: ["state": stateString(peripheral.state)])
    }
  }
  
  private func stateString(_ state: CBManagerState) -> String {
    switch state {
    case .poweredOn: return "poweredOn"
    case .poweredOff: return "poweredOff"
    case .unauthorized: return "unauthorized"
    case .unsupported: return "unsupported"
    case .resetting: return "resetting"
    case .unknown: return "unknown"
    @unknown default: return "unknown"
    }
  }
  
  private func setupService() {
    guard let peripheralManager = peripheralManager else { return }
    
    let serviceUUID = CBUUID(string: serviceUuid)
    
    guard let gameStateUUIDString = characteristics["GAME_STATE"], !gameStateUUIDString.isEmpty else {
      print("[BLEPeripheralModule] Error: GAME_STATE characteristic UUID is missing")
      return
    }
    let gameStateUUID = CBUUID(string: gameStateUUIDString)
    gameStateCharacteristic = CBMutableCharacteristic(
      type: gameStateUUID,
      properties: [.read, .notify, .indicate],
      value: nil,
      permissions: [.readable]
    )
    
    guard let playerInputUUIDString = characteristics["PLAYER_INPUT"], !playerInputUUIDString.isEmpty else {
      print("[BLEPeripheralModule] Error: PLAYER_INPUT characteristic UUID is missing")
      return
    }
    let playerInputUUID = CBUUID(string: playerInputUUIDString)
    playerInputCharacteristic = CBMutableCharacteristic(
      type: playerInputUUID,
      properties: [.write, .writeWithoutResponse],
      value: nil,
      permissions: [.writeable]
    )
    
    guard let sessionInfoUUIDString = characteristics["SESSION_INFO"], !sessionInfoUUIDString.isEmpty else {
      print("[BLEPeripheralModule] Error: SESSION_INFO characteristic UUID is missing")
      return
    }
    let sessionInfoUUID = CBUUID(string: sessionInfoUUIDString)
    let sessionInfoData = sessionInfo.data(using: .utf8)
    sessionInfoCharacteristic = CBMutableCharacteristic(
      type: sessionInfoUUID,
      properties: [.read],
      value: sessionInfoData,
      permissions: [.readable]
    )
    
    guard let controlUUIDString = characteristics["CONTROL"], !controlUUIDString.isEmpty else {
      print("[BLEPeripheralModule] Error: CONTROL characteristic UUID is missing")
      return
    }
    let controlUUID = CBUUID(string: controlUUIDString)
    controlCharacteristic = CBMutableCharacteristic(
      type: controlUUID,
      properties: [.read, .notify, .indicate],
      value: nil,
      permissions: [.readable]
    )
    
    guard let gameState = gameStateCharacteristic,
          let playerInput = playerInputCharacteristic,
          let sessionInfo = sessionInfoCharacteristic,
          let control = controlCharacteristic else {
      print("[BLEPeripheralModule] Error: Failed to create one or more characteristics")
      return
    }
    
    service = CBMutableService(type: serviceUUID, primary: true)
    service?.characteristics = [
      gameState,
      playerInput,
      sessionInfo,
      control
    ]
    
    guard let service = service else {
      print("[BLEPeripheralModule] Error: Failed to create service")
      return
    }
    
    peripheralManager.add(service)
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if let error = error {
      print("[BLEPeripheralModule] Error adding service: \(error.localizedDescription)")
    } else {
      print("[BLEPeripheralModule] Service added successfully")
    }
  }
  
  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error = error {
      print("[BLEPeripheralModule] Error starting advertising: \(error.localizedDescription)")
    } else {
      print("[BLEPeripheralModule] Started advertising")
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
    let clientId = central.identifier.uuidString
    connectedCentrals[central.identifier] = central
    
    let clientName = centralNames[central.identifier] ?? "Device-\(clientId.prefix(4))"
    
    print("[BLEPeripheralModule] Central \(clientId) subscribed to \(characteristic.uuid)")
    
    if hasListeners {
      sendEvent(withName: "onClientConnected", body: [
        "clientId": clientId,
        "clientName": clientName
      ])
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
    let clientId = central.identifier.uuidString
    connectedCentrals.removeValue(forKey: central.identifier)
    centralNames.removeValue(forKey: central.identifier)
    
    print("[BLEPeripheralModule] Central \(clientId) unsubscribed from \(characteristic.uuid)")
    
    if hasListeners {
      sendEvent(withName: "onClientDisconnected", body: ["clientId": clientId])
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    if request.characteristic.uuid == sessionInfoCharacteristic?.uuid {
      if let data = sessionInfo.data(using: .utf8) {
        if request.offset > data.count {
          peripheral.respond(to: request, withResult: .invalidOffset)
          return
        }
        request.value = data.subdata(in: request.offset..<data.count)
        peripheral.respond(to: request, withResult: .success)
      } else {
        peripheral.respond(to: request, withResult: .unlikelyError)
      }
    } else {
      peripheral.respond(to: request, withResult: .requestNotSupported)
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      if request.characteristic.uuid == playerInputCharacteristic?.uuid {
        if let data = request.value {
          let clientId = request.central.identifier.uuidString
          let base64Data = data.base64EncodedString()
          
          if !connectedCentrals.keys.contains(request.central.identifier) {
            connectedCentrals[request.central.identifier] = request.central
            
            let clientName = "Device-\(clientId.prefix(4))"
            centralNames[request.central.identifier] = clientName
            
            if hasListeners {
              sendEvent(withName: "onClientConnected", body: [
                "clientId": clientId,
                "clientName": clientName
              ])
            }
          }
          
          if hasListeners {
            sendEvent(withName: "onDataReceived", body: [
              "clientId": clientId,
              "data": base64Data
            ])
          }
        }
        peripheral.respond(to: request, withResult: .success)
      } else {
        peripheral.respond(to: request, withResult: .requestNotSupported)
      }
    }
  }
  
  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    print("[BLEPeripheralModule] Ready to update subscribers (queue cleared)")
  }
}
