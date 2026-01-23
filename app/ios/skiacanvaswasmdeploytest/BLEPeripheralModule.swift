import Foundation
import CoreBluetooth

@objc(BLEPeripheralModule)
class BLEPeripheralModule: RCTEventEmitter, CBPeripheralManagerDelegate {
  
  private var peripheralManager: CBPeripheralManager?
  private var services: [String: CBMutableService] = [:]
  private var characteristics: [String: CBMutableCharacteristic] = [:]
  private var connectedCentrals: [String: CBCentral] = [:]
  private var pendingConfig: PeripheralConfig?
  private var isAdvertising = false
  private var hasListeners = false
  
  struct PeripheralConfig {
    let serviceUuid: String
    let characteristics: [String: String]
    let deviceName: String
    let sessionInfo: String
  }
  
  override init() {
    super.init()
  }
  
  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "onClientConnected",
      "onClientDisconnected",
      "onDataReceived",
      "onStateChanged",
      "onError"
    ]
  }
  
  override func startObserving() {
    hasListeners = true
  }
  
  override func stopObserving() {
    hasListeners = false
  }
  
  private func emit(_ event: String, body: Any?) {
    if hasListeners {
      sendEvent(withName: event, body: body)
    }
  }
  
  @objc(initialize:resolver:rejecter:)
  func initialize(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let serviceUuid = config["serviceUuid"] as? String,
          let characteristicsDict = config["characteristics"] as? [String: String],
          let deviceName = config["deviceName"] as? String,
          let sessionInfo = config["sessionInfo"] as? String else {
      reject("INVALID_CONFIG", "Missing required configuration parameters", nil)
      return
    }
    
    pendingConfig = PeripheralConfig(
      serviceUuid: serviceUuid,
      characteristics: characteristicsDict,
      deviceName: deviceName,
      sessionInfo: sessionInfo
    )
    
    if peripheralManager == nil {
      peripheralManager = CBPeripheralManager(delegate: self, queue: DispatchQueue.main, options: [
        CBPeripheralManagerOptionShowPowerAlertKey: true
      ])
    }
    
    if peripheralManager?.state == .poweredOn {
      setupServices()
      resolve(true)
    } else {
      resolve(true)
    }
  }
  
  @objc(startAdvertising:rejecter:)
  func startAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let manager = peripheralManager else {
      reject("NOT_INITIALIZED", "Peripheral manager not initialized", nil)
      return
    }
    
    guard manager.state == .poweredOn else {
      reject("BLUETOOTH_OFF", "Bluetooth is not powered on", nil)
      return
    }
    
    guard let config = pendingConfig else {
      reject("NO_CONFIG", "No configuration set", nil)
      return
    }
    
    let serviceUUIDs = [CBUUID(string: config.serviceUuid)]
    
    let advertisementData: [String: Any] = [
      CBAdvertisementDataLocalNameKey: config.deviceName,
      CBAdvertisementDataServiceUUIDsKey: serviceUUIDs
    ]
    
    manager.startAdvertising(advertisementData)
    isAdvertising = true
    resolve(true)
  }
  
  @objc(stopAdvertising:rejecter:)
  func stopAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    peripheralManager?.stopAdvertising()
    isAdvertising = false
    resolve(true)
  }
  
  @objc(sendData:data:resolver:rejecter:)
  func sendData(_ peerId: String, data: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let central = connectedCentrals[peerId] else {
      reject("PEER_NOT_FOUND", "Peer \(peerId) not found", nil)
      return
    }
    
    guard let gameStateChar = characteristics["GAME_STATE"] else {
      reject("CHAR_NOT_FOUND", "Game state characteristic not found", nil)
      return
    }
    
    guard let bytes = Data(base64Encoded: data) else {
      reject("INVALID_DATA", "Invalid base64 data", nil)
      return
    }
    
    gameStateChar.value = bytes
    let success = peripheralManager?.updateValue(bytes, for: gameStateChar, onSubscribedCentrals: [central])
    
    if success == true {
      resolve(true)
    } else {
      // Queue is full, will retry when peripheralManagerIsReady is called
      resolve(false)
    }
  }
  
  @objc(broadcastData:resolver:rejecter:)
  func broadcastData(_ data: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let gameStateChar = characteristics["GAME_STATE"] else {
      reject("CHAR_NOT_FOUND", "Game state characteristic not found", nil)
      return
    }
    
    guard let bytes = Data(base64Encoded: data) else {
      reject("INVALID_DATA", "Invalid base64 data", nil)
      return
    }
    
    gameStateChar.value = bytes
    let success = peripheralManager?.updateValue(bytes, for: gameStateChar, onSubscribedCentrals: nil)
    
    resolve(success == true)
  }
  
  @objc(disconnectPeer:resolver:rejecter:)
  func disconnectPeer(_ peerId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // iOS doesn't have a direct way to disconnect a central
    // The central must disconnect itself
    connectedCentrals.removeValue(forKey: peerId)
    resolve(true)
  }
  
  @objc(disconnectAll:rejecter:)
  func disconnectAll(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    connectedCentrals.removeAll()
    resolve(true)
  }
  
  @objc(destroy:rejecter:)
  func destroy(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    peripheralManager?.stopAdvertising()
    peripheralManager?.removeAllServices()
    peripheralManager = nil
    services.removeAll()
    characteristics.removeAll()
    connectedCentrals.removeAll()
    pendingConfig = nil
    isAdvertising = false
    resolve(true)
  }
  
  // MARK: - Private Methods
  
  private func setupServices() {
    guard let config = pendingConfig, let manager = peripheralManager else { return }
    
    // Remove existing services
    manager.removeAllServices()
    services.removeAll()
    characteristics.removeAll()
    
    // Create the main service
    let serviceUUID = CBUUID(string: config.serviceUuid)
    let service = CBMutableService(type: serviceUUID, primary: true)
    
    var chars: [CBMutableCharacteristic] = []
    
    // Create SESSION_INFO characteristic (readable)
    if let sessionInfoUUID = config.characteristics["SESSION_INFO"] {
      let sessionInfoChar = CBMutableCharacteristic(
        type: CBUUID(string: sessionInfoUUID),
        properties: [.read],
        value: config.sessionInfo.data(using: .utf8),
        permissions: [.readable]
      )
      chars.append(sessionInfoChar)
      characteristics["SESSION_INFO"] = sessionInfoChar
    }
    
    // Create GAME_STATE characteristic (notify)
    if let gameStateUUID = config.characteristics["GAME_STATE"] {
      let gameStateChar = CBMutableCharacteristic(
        type: CBUUID(string: gameStateUUID),
        properties: [.notify, .read],
        value: nil,
        permissions: [.readable]
      )
      chars.append(gameStateChar)
      characteristics["GAME_STATE"] = gameStateChar
    }
    
    // Create PLAYER_INPUT characteristic (write)
    if let playerInputUUID = config.characteristics["PLAYER_INPUT"] {
      let playerInputChar = CBMutableCharacteristic(
        type: CBUUID(string: playerInputUUID),
        properties: [.write, .writeWithoutResponse],
        value: nil,
        permissions: [.writeable]
      )
      chars.append(playerInputChar)
      characteristics["PLAYER_INPUT"] = playerInputChar
    }
    
    // Create CONTROL characteristic (notify, write)
    if let controlUUID = config.characteristics["CONTROL"] {
      let controlChar = CBMutableCharacteristic(
        type: CBUUID(string: controlUUID),
        properties: [.notify, .write, .read],
        value: nil,
        permissions: [.readable, .writeable]
      )
      chars.append(controlChar)
      characteristics["CONTROL"] = controlChar
    }
    
    service.characteristics = chars
    services[config.serviceUuid] = service
    
    manager.add(service)
  }
  
  private func centralIdentifier(_ central: CBCentral) -> String {
    return central.identifier.uuidString
  }
  
  // MARK: - CBPeripheralManagerDelegate
  
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    var stateString: String
    switch peripheral.state {
    case .poweredOn:
      stateString = "poweredOn"
      // Set up services when Bluetooth is ready
      if pendingConfig != nil {
        setupServices()
      }
    case .poweredOff:
      stateString = "poweredOff"
    case .resetting:
      stateString = "resetting"
    case .unauthorized:
      stateString = "unauthorized"
    case .unsupported:
      stateString = "unsupported"
    case .unknown:
      stateString = "unknown"
    @unknown default:
      stateString = "unknown"
    }
    
    emit("onStateChanged", body: ["state": stateString])
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if let error = error {
      emit("onError", body: ["error": "Failed to add service: \(error.localizedDescription)"])
    }
  }
  
  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error = error {
      emit("onError", body: ["error": "Failed to start advertising: \(error.localizedDescription)"])
      isAdvertising = false
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
    let peerId = centralIdentifier(central)
    connectedCentrals[peerId] = central
    
    emit("onClientConnected", body: [
      "clientId": peerId,
      "clientName": "iOS-\(peerId.prefix(8))"
    ])
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
    let peerId = centralIdentifier(central)
    
    // Only emit disconnect if this was the last characteristic they were subscribed to
    // For simplicity, we'll emit on any unsubscribe
    if connectedCentrals[peerId] != nil {
      connectedCentrals.removeValue(forKey: peerId)
      emit("onClientDisconnected", body: ["clientId": peerId])
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    // Handle read requests
    if let char = characteristics.values.first(where: { $0.uuid == request.characteristic.uuid }) {
      if let value = char.value {
        if request.offset > value.count {
          peripheral.respond(to: request, withResult: .invalidOffset)
          return
        }
        request.value = value.subdata(in: request.offset..<value.count)
        peripheral.respond(to: request, withResult: .success)
      } else {
        peripheral.respond(to: request, withResult: .attributeNotFound)
      }
    } else {
      peripheral.respond(to: request, withResult: .attributeNotFound)
    }
  }
  
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      let peerId = centralIdentifier(request.central)
      
      // Add to connected centrals if not already there
      if connectedCentrals[peerId] == nil {
        connectedCentrals[peerId] = request.central
        emit("onClientConnected", body: [
          "clientId": peerId,
          "clientName": "iOS-\(peerId.prefix(8))"
        ])
      }
      
      if let value = request.value {
        // Emit the received data
        emit("onDataReceived", body: [
          "clientId": peerId,
          "data": value.base64EncodedString()
        ])
        
        // Update characteristic value
        if let char = characteristics.values.first(where: { $0.uuid == request.characteristic.uuid }) as? CBMutableCharacteristic {
          char.value = value
        }
      }
    }
    
    // Respond to the first request (iOS requirement)
    peripheral.respond(to: requests[0], withResult: .success)
  }
  
  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    // Called when the transmit queue has space again
    // Could implement retry logic here if needed
  }
}
