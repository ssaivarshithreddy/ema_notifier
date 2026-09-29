const express = require('express');
const router = express.Router();
const WatchlistModel = require('../models/Watchlist');

module.exports = function(monitoringService) {
  // GET /api/watchlist
  router.get('/', async (req, res) => {
    try {
      const dbList = await WatchlistModel.getAll();
      let liveStatuses = monitoringService.getAllInstrumentStatuses();

      // Trigger watchlist sync if cache is empty (cold start on serverless)
      if (liveStatuses.length === 0 && !monitoringService.isInitializing) {
        monitoringService.syncWatchlist().catch(() => {});
        liveStatuses = monitoringService.getAllInstrumentStatuses();
      }

      const merged = dbList.map(item => {
        const live = liveStatuses.find(l => l.symbol === item.symbol.toUpperCase());
        return {
          ...item,
          price: live?.price ?? null,
          ema200: live?.ema200 ?? null,
          distance: live?.distance ?? 0,
          direction: live?.direction ?? 'Unknown',
          status: live?.status ?? (item.enabled ? 'Monitoring' : 'Disabled'),
          state: live?.state ?? 'NORMAL',
          provider: live?.provider ?? 'Unknown'
        };
      });

      res.json({ success: true, data: merged });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/watchlist (Add symbol)
  router.post('/', async (req, res) => {
    try {
      const { symbol, timeframe, ema_period } = req.body;
      if (!symbol) {
        return res.status(400).json({ success: false, error: 'Symbol is required' });
      }

      const sym = symbol.toUpperCase().trim();
      const existing = await WatchlistModel.getBySymbol(sym);
      if (existing) {
        return res.status(400).json({ success: false, error: `Symbol ${sym} already exists in watchlist` });
      }

      const added = await WatchlistModel.add(sym, timeframe || '5m', ema_period || 200);
      await monitoringService.initializeInstrument(sym, added.timeframe, added.ema_period);

      res.json({ success: true, data: added });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/watchlist/:symbol
  router.put('/:symbol', async (req, res) => {
    try {
      const sym = req.params.symbol.toUpperCase();
      const { enabled, timeframe, ema_period } = req.body;

      const updated = await WatchlistModel.update(sym, { enabled, timeframe, ema_period });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Symbol not found' });
      }

      if (enabled === false) {
        await monitoringService.marketManager.unsubscribe(sym);
      } else if (enabled === true) {
        await monitoringService.initializeInstrument(sym, updated.timeframe, updated.ema_period);
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/watchlist/:symbol
  router.delete('/:symbol', async (req, res) => {
    try {
      const sym = req.params.symbol.toUpperCase();
      const removed = await WatchlistModel.remove(sym);
      if (!removed) {
        return res.status(404).json({ success: false, error: 'Symbol not found' });
      }

      await monitoringService.marketManager.unsubscribe(sym);
      monitoringService.instrumentCache.delete(sym);

      res.json({ success: true, data: removed });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
