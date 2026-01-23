#!/usr/bin/env node
/**
 * Mock WebSocket Relay Server for Multiplayer Testing
 *
 * This is a minimal relay server that forwards messages between connected clients.
 * It supports the room-based session model used by the WebSocketTransport.
 *
 * Usage:
 *   node scripts/mock-multiplayer-server.mjs [port]
 *
 * Default port: 8787
 */

import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.argv[2] || '8787', 10);

const rooms = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`Mock multiplayer server running on ws://localhost:${PORT}`);

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePeerId() {
  return `peer_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

function getRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      code: roomCode,
      hostId: null,
      peers: new Map(),
      gameState: null,
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomCode);
}

function broadcast(room, message, excludePeerId = null) {
  const payload = JSON.stringify(message);
  for (const [peerId, peer] of room.peers) {
    if (peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(payload);
    }
  }
}

function sendTo(room, peerId, message) {
  const peer = room.peers.get(peerId);
  if (peer && peer.ws.readyState === WebSocket.OPEN) {
    peer.ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentPeerId = null;
  let currentPeerName = null;

  console.log('New connection');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'create_room': {
          const roomCode = generateRoomCode();
          const peerId = generatePeerId();
          const room = getRoom(roomCode);

          room.hostId = peerId;
          room.peers.set(peerId, {
            ws,
            name: message.deviceName || 'Host',
            joinedAt: Date.now(),
          });

          currentRoom = room;
          currentPeerId = peerId;
          currentPeerName = message.deviceName || 'Host';

          ws.send(
            JSON.stringify({
              type: 'room_created',
              roomCode,
              peerId,
              isHost: true,
            })
          );

          console.log(`Room ${roomCode} created by ${currentPeerName}`);
          break;
        }

        case 'join_room': {
          const room = rooms.get(message.roomCode);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'error',
                error: 'Room not found',
              })
            );
            return;
          }

          const peerId = generatePeerId();
          room.peers.set(peerId, {
            ws,
            name: message.deviceName || 'Player',
            joinedAt: Date.now(),
          });

          currentRoom = room;
          currentPeerId = peerId;
          currentPeerName = message.deviceName || 'Player';

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomCode: message.roomCode,
              peerId,
              isHost: false,
              hostId: room.hostId,
              peers: Array.from(room.peers.entries()).map(([id, p]) => ({
                id,
                name: p.name,
                isHost: id === room.hostId,
              })),
            })
          );

          broadcast(
            room,
            {
              type: 'peer_joined',
              peerId,
              peerName: currentPeerName,
            },
            peerId
          );

          console.log(`${currentPeerName} joined room ${message.roomCode}`);
          break;
        }

        case 'relay': {
          if (!currentRoom) return;

          if (message.to) {
            sendTo(currentRoom, message.to, {
              type: 'relayed',
              from: currentPeerId,
              payload: message.payload,
            });
          } else {
            broadcast(
              currentRoom,
              {
                type: 'relayed',
                from: currentPeerId,
                payload: message.payload,
              },
              currentPeerId
            );
          }
          break;
        }

        case 'ping': {
          ws.send(
            JSON.stringify({
              type: 'pong',
              timestamp: message.timestamp,
              serverTime: Date.now(),
            })
          );
          break;
        }

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentPeerId) {
      currentRoom.peers.delete(currentPeerId);

      broadcast(currentRoom, {
        type: 'peer_left',
        peerId: currentPeerId,
        reason: 'disconnected',
      });

      console.log(`${currentPeerName} disconnected from room ${currentRoom.code}`);

      if (currentRoom.peers.size === 0) {
        rooms.delete(currentRoom.code);
        console.log(`Room ${currentRoom.code} deleted (empty)`);
      } else if (currentPeerId === currentRoom.hostId) {
        const newHostId = currentRoom.peers.keys().next().value;
        currentRoom.hostId = newHostId;
        broadcast(currentRoom, {
          type: 'host_changed',
          newHostId,
        });
        console.log(`Host migrated to ${newHostId}`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;

  for (const [code, room] of rooms) {
    if (room.peers.size === 0 && now - room.createdAt > maxAge) {
      rooms.delete(code);
      console.log(`Room ${code} expired`);
    }
  }
}, 60 * 1000);

console.log('\nAPI:');
console.log('  create_room { deviceName }                    -> room_created { roomCode, peerId, isHost }');
console.log('  join_room { roomCode, deviceName }            -> room_joined { roomCode, peerId, isHost, hostId, peers }');
console.log('  relay { payload, to? }                        -> relayed { from, payload } (broadcast or targeted)');
console.log('  ping { timestamp }                            -> pong { timestamp, serverTime }');
console.log('\nEvents:');
console.log('  peer_joined { peerId, peerName }');
console.log('  peer_left { peerId, reason }');
console.log('  host_changed { newHostId }');
console.log('');
