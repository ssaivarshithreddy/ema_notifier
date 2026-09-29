const EventEmitter = require('events');
const WatchlistModel = require('../models/Watchlist');
const SettingsModel = require('../models/Settings');
const AlertModel = require('../models/Alert');
const CandleService = require('./CandleService');
const EMAService = require('./EMAService');
const AlertDetectionService = require('./AlertDetectionService');
const NotificationService = require('./NotificationService');
const MarketManager = require('../providers/market/MarketManager');
const logger = require('../utils/logger');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.marketManager = new MarketManager();
    this.candleService = new CandleService();
    this.emaService = new EMAService(200);
    this.alertDetector = new AlertDetectionService();
    this.notificationService = new NotificationService();

    // Memory state cache for fast frontend queries
    // Map symbol -> { symbol, price, ema200, distance, direction, status, state, lastUpdate, completedCandlesCount, candles }
    this.instrumentCache = new Map();
    this.isInitializing = false;
  }

  async start() {
    logger.info('[MonitoringService] Starting EMA 200 Monitoring Engine...');
    this.isInitializing = true;

    // Listen to market ticks from MarketManager
    this.marketManager.on('price', async (tick) => {
      await this.handleTick(tick);
    });

    this.marketManager.on('provider_status', (status) => {
      this.emit('provider_status', status);
    });

    // Load watchlist and initialize instruments
    await this.syncWatchlist();
    this.isInitializing = false;
    logger.info('[MonitoringService] Engine initialized and actively monitoring');
  }

  async syncWatchlist() {
    try {
      const enabledList = await WatchlistModel.getEnabled();
      logger.info(`[MonitoringService] Initializing ${enabledList.length} enabled instruments...`);

      for (const item of enabledList) {
        await this.initializeInstrument(item.symbol, item.timeframe || '5m', item.ema_period || 200);
      }
    } catch (err) {
      logger.error(`[MonitoringService] Watchlist sync error: ${err.message}`);
    }
  }

  async initializeInstrument(symbol, timeframe = '5m', emaPeriod = 200) {
    const sym = symbol.toUpperCase();
    logger.info(`[MonitoringService] Loading historical candles for ${sym}...`);

    try {
      // Step 1: Load 300 historical candles from market data provider
      const historical = await this.marketManager.fetchHistoricalCandles(sym, timeframe, 300);
      this.candleService.setHistoricalCandles(sym, historical);

      const completed = this.candleService.getCompletedCandles(sym);
      const latestPrice = completed.length > 0 ? completed[completed.length - 1].close : null;

      // Step 2: Calculate EMA 200
      const emaResult = this.emaService.calculateLatest(completed, latestPrice, emaPeriod);

      const distance = (latestPrice && emaResult.liveEMA)
        ? parseFloat(((Math.abs(latestPrice - emaResult.liveEMA) / emaResult.liveEMA) * 100).toFixed(4))
        : 0;

      const direction = (latestPrice && emaResult.liveEMA)
        ? (latestPrice >= emaResult.liveEMA ? 'Above EMA' : 'Below EMA')
        : 'Unknown';

      this.instrumentCache.set(sym, {
        symbol: sym,
        price: latestPrice,
        ema200: emaResult.liveEMA ? parseFloat(emaResult.liveEMA.toFixed(4)) : null,
        distance,
        direction,
        status: 'Monitoring',
        state: 'NORMAL',
        lastUpdate: Date.now(),
        completedCount: completed.length,
        hasSufficientData: emaResult.hasSufficientData,
        provider: this.marketManager.isCrypto(sym) ? 'Binance Crypto' : 'Forex/Metals'
      });

      // Step 3: Subscribe to live price ticks
      await this.marketManager.subscribe(sym);
      logger.info(`[MonitoringService] ${sym} initialized (${completed.length} 5m candles loaded, EMA: ${emaResult.liveEMA ? emaResult.liveEMA.toFixed(2) : 'N/A'})`);
    } catch (err) {
      logger.error(`[MonitoringService] Failed to initialize ${sym}: ${err.message}`);
      // Cache with error status
      this.instrumentCache.set(sym, {
        symbol: sym,
        price: null,
        ema200: null,
        distance: 0,
        direction: 'Unknown',
        status: 'Init Error',
        state: 'NORMAL',
        lastUpdate: Date.now(),
        completedCount: 0,
        hasSufficientData: false,
        error: err.message
      });
    }
  }

  async handleTick(tick) {
    const { symbol, price, volume, timestamp } = tick;
    const sym = symbol.toUpperCase();

    // Step 4 & 5: Process tick into 5-minute candle engine
    const candleResult = this.candleService.processTick(sym, price, volume, timestamp);
    const completed = this.candleService.getCompletedCandles(sym);

    // Step 6: Recalculate EMA 200
    const settings = await SettingsModel.get();
    const emaPeriod = settings.ema_period || 200;
    const emaResult = this.emaService.calculateLatest(completed, price, emaPeriod);

    if (!emaResult.hasSufficientData || !emaResult.liveEMA) {
      return;
    }

    const liveEMA = parseFloat(emaResult.liveEMA.toFixed(6));
    const distance = parseFloat(((Math.abs(price - liveEMA) / liveEMA) * 100).toFixed(4));
    const directionStr = price >= liveEMA ? 'ABOVE EMA' : 'BELOW EMA';

    // Step 7, 8, 9, 10: Alert Detection State Machine
    const alertResult = this.alertDetector.evaluate({
      symbol: sym,
      currentPrice: price,
      emaValue: liveEMA,
      settings
    });

    // Update Cache
    const existingCache = this.instrumentCache.get(sym) || {};
    const updatedCache = {
      ...existingCache,
      symbol: sym,
      price,
      ema200: liveEMA,
      distance,
      direction: directionStr,
      status: this.marketManager.isStale(sym) ? 'DATA STALE' : 'Monitoring',
      state: alertResult.state || existingCache.state || 'NORMAL',
      lastUpdate: Date.now(),
      completedCount: completed.length,
      hasSufficientData: true
    };
    this.instrumentCache.set(sym, updatedCache);

    // Broadcast Price Update to WebSocket Clients
    this.emit('broadcast', {
      type: 'PRICE_UPDATE',
      symbol: sym,
      price,
      ema200: liveEMA,
      distance,
      direction: directionStr,
      status: updatedCache.status,
      timestamp: Date.now()
    });

    // Step 11 - 16: Handle Triggered Alert
    if (alertResult.triggered) {
      try {
        // 12. Save Alert to DB
        const alertRecord = await AlertModel.create({
          symbol: sym,
          timeframe: settings.timeframe || '5m',
          ema_period: emaPeriod,
          price,
          ema_value: liveEMA,
          event_type: alertResult.eventType,
          distance_percentage: alertResult.distancePercentage,
          direction: alertResult.direction
        });

        // 13, 14, 15. Send Notifications (Telegram & WhatsApp)
        const notificationResults = await this.notificationService.sendNotifications(alertRecord, settings);

        // 16. Broadcast Alert Created to WebSocket Clients
        this.emit('broadcast', {
          type: 'ALERT_CREATED',
          alert: alertRecord,
          notifications: notificationResults
        });
      } catch (err) {
        logger.error(`[MonitoringService] Failed processing alert for ${sym}: ${err.message}`);
      }
    }
  }

  getInstrumentStatus(symbol) {
    const sym = symbol.toUpperCase();
    const cache = this.instrumentCache.get(sym);
    if (!cache) return null;

    const candles = this.candleService.getAllCandles(sym);
    const isStale = this.marketManager.isStale(sym);

    return {
      ...cache,
      status: isStale ? 'DATA STALE' : cache.status,
      candles
    };
  }

  getAllInstrumentStatuses() {
    const list = [];
    for (const [sym, item] of this.instrumentCache.entries()) {
      const isStale = this.marketManager.isStale(sym);
      list.push({
        ...item,
        status: isStale ? 'DATA STALE' : item.status
      });
    }
    return list;
  }
}

module.exports = MonitoringService;
