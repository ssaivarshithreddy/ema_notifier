const WebSocket = require('ws');
const logger = require('../utils/logger');

let wss = null;

function initWebSocketServer(server, monitoringService) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    logger.info('[WebSocket] Client connected');

    // Send initial snapshot of all monitored instruments
    const initialData = {
      type: 'CONNECTION_STATUS',
      status: 'CONNECTED',
      instruments: monitoringService.getAllInstrumentStatuses(),
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(initialData));

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        // ignore
      }
    });

    ws.on('close', () => {
      logger.info('[WebSocket] Client disconnected');
    });
  });

  // Listen to events from monitoring engine and broadcast to all connected clients
  monitoringService.on('broadcast', (payload) => {
    broadcast(payload);
  });

  monitoringService.on('provider_status', (status) => {
    broadcast({
      type: 'MARKET_STATUS',
      providerStatus: status,
      timestamp: Date.now()
    });
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const payloadStr = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payloadStr);
    }
  });
}

module.exports = {
  initWebSocketServer,
  broadcast
};
