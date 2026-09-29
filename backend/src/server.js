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

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Initialize DB connection
  await db.initDb();

  // Instantiate Monitoring Engine
  const monitoringService = new MonitoringService();

  // Register API Routes
  app.use('/', healthRoute(monitoringService));
  app.use('/api/watchlist', watchlistRoute(monitoringService));
  app.use('/api/alerts', alertsRoute(monitoringService));
  app.use('/api/settings', settingsRoute(monitoringService));
  app.use('/api/candles', candlesRoute(monitoringService));

  // HTTP & WebSocket Server Creation
  const server = http.createServer(app);
  initWebSocketServer(server, monitoringService);

  const PORT = env.PORT || 5000;
  server.listen(PORT, async () => {
    logger.info(`====================================================`);
    logger.info(`  EMA 200 Touch Alert Backend running on port ${PORT} `);
    logger.info(`====================================================`);

    // Start Monitoring Engine
    await monitoringService.start();
  });
}

bootstrap().catch(err => {
  logger.error('Fatal bootstrap error:', err);
  process.exit(1);
});
