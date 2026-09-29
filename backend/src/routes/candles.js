const express = require('express');
const router = express.Router();
const SettingsModel = require('../models/Settings');

module.exports = function(monitoringService) {
  // GET /api/candles/:symbol
  router.get('/:symbol', async (req, res) => {
    try {
      const sym = req.params.symbol.toUpperCase();
      let statusData = monitoringService.getInstrumentStatus(sym);

      // On-demand initialization if not yet present in memory cache
      if (!statusData || !statusData.candles || statusData.candles.length === 0) {
        try {
          await monitoringService.initializeInstrument(sym);
          statusData = monitoringService.getInstrumentStatus(sym);
        } catch (e) {
          // ignore
        }
      }

      // If still initializing, return 200 OK with initial status instead of 404 Error
      if (!statusData) {
        return res.json({
          success: true,
          data: {
            symbol: sym,
            status: 'Initializing',
            price: null,
            ema200: null,
            distance: 0,
            direction: 'Unknown',
            provider: 'Loading',
            candles: [],
            emaSeries: []
          }
        });
      }

      const settings = await SettingsModel.get();
      const emaPeriod = settings.ema_period || 200;
      const candles = statusData.candles || [];

      // Compute full EMA series for chart rendering
      const emaSeries = monitoringService.emaService.calculateSeries(candles, emaPeriod);

      const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
      const latestEMAObj = emaSeries.length > 0 ? emaSeries[emaSeries.length - 1] : null;

      const currentPrice = latestCandle ? latestCandle.close : statusData.price;
      const currentEMA = latestEMAObj ? latestEMAObj.ema : statusData.ema200;

      const distance = (currentPrice && currentEMA)
        ? parseFloat(((Math.abs(currentPrice - currentEMA) / currentEMA) * 100).toFixed(4))
        : 0;

      const direction = (currentPrice && currentEMA)
        ? (currentPrice >= currentEMA ? 'ABOVE EMA' : 'BELOW EMA')
        : 'Unknown';

      res.json({
        success: true,
        data: {
          symbol: sym,
          status: statusData.status,
          price: currentPrice,
          ema200: currentEMA,
          distance,
          direction,
          provider: statusData.provider,
          candles,
          emaSeries
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
