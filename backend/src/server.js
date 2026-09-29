const http = require('http');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const db = require('./db');
const MonitoringService = require('./services/MonitoringService');
const { initWebSocketServer } = require('./websocket/marketSocket');

const watchlistRoute = require('./routes/watchlist');
const alertsRoute = require('./routes/alerts');
const settingsRoute = require('./routes/settings');
const candlesRoute = require('./routes/candles');
const healthRoute = require('./routes/health');

const app = express();
app.use(cors());
app.use(express.json());

// Lazy-initialized Monitoring Engine instance
let monitoringServiceInstance = null;
let dbInitialized = false;

async function getMonitoringService() {
  if (!dbInitialized) {
    await db.initDb();
    dbInitialized = true;
  }
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new MonitoringService();
    monitoringServiceInstance.start().catch(err => {
      logger.error('[Server] Monitoring engine start error:', err);
    });
  }
  return monitoringServiceInstance;
}

// Middleware to attach monitoringService to request context
app.use(async (req, res, next) => {
  try {
    req.monitoringService = await getMonitoringService();
    next();
  } catch (err) {
    next(err);
  }
});

// Register API Routes
app.use('/', (req, res, next) => {
  if (req.path === '/health' || req.path === '/') {
    return healthRoute(req.monitoringService)(req, res, next);
  }
  next();
});
app.use('/api/watchlist', (req, res, next) => watchlistRoute(req.monitoringService)(req, res, next));
app.use('/api/alerts', (req, res, next) => alertsRoute()(req, res, next));
app.use('/api/settings', (req, res, next) => settingsRoute()(req, res, next));
app.use('/api/candles', (req, res, next) => candlesRoute(req.monitoringService)(req, res, next));

// Start standalone HTTP & WebSocket server if run directly (node src/server.js)
if (require.main === module || process.env.STANDALONE_SERVER === 'true') {
  const PORT = env.PORT || 5000;
  getMonitoringService().then((monitoringService) => {
    const server = http.createServer(app);
    initWebSocketServer(server, monitoringService);
    server.listen(PORT, () => {
      logger.info(`====================================================`);
      logger.info(`  EMA 200 Touch Alert Backend running on port ${PORT} `);
      logger.info(`====================================================`);
    });
  });
}

module.exports = app;
