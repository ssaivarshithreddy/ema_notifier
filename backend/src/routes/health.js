const express = require('express');
const router = express.Router();
const db = require('../db');

module.exports = function(monitoringService) {
  // GET /health
  router.get('/health', (req, res) => {
    const dbConnected = db.getIsConnected();
    const marketStatus = monitoringService.marketManager.getStatus();

    const isMarketConnected = marketStatus.crypto.connected || marketStatus.forex.connected;
    const telegramConfigured = monitoringService.notificationService.telegramProvider.isConfigured();
    const whatsappConfigured = monitoringService.notificationService.whatsAppProvider.isConfigured();

    const monitoredCount = monitoringService.getAllInstrumentStatuses().length;

    // Find latest market update timestamp across instruments
    let latestUpdate = null;
    monitoringService.instrumentCache.forEach(item => {
      if (item.lastUpdate && (!latestUpdate || item.lastUpdate > latestUpdate)) {
        latestUpdate = item.lastUpdate;
      }
    });

    res.json({
      server: "healthy",
      database: dbConnected ? "connected" : "memory_fallback",
      marketData: isMarketConnected ? "connected" : "reconnecting",
      telegram: telegramConfigured ? "configured" : "unconfigured",
      whatsapp: whatsappConfigured ? "configured" : "unconfigured",
      monitoredSymbols: monitoredCount,
      lastMarketUpdate: latestUpdate ? new Date(latestUpdate).toISOString() : null,
      providerDetails: marketStatus
    });
  });

  return router;
};
