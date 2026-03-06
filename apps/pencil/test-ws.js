const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8090/ws');

ws.on('open', function open() {
  console.log('connected');
  ws.send(JSON.stringify({ type: 'test' }));
});

ws.on('message', function incoming(data) {
  console.log('received: %s', data);
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('timeout');
  process.exit(1);
}, 5000);
