class CandleService {
  constructor() {
    // Map symbol -> { candles: [{ timestamp, open, high, low, close, volume }], currentCandle: {...} }
    this.symbolCandles = new Map();
  }

  /**
   * Get 5-minute bucket timestamp in ms (aligned to UTC 5m boundaries)
   */
  static get5mBucketTimestamp(timestampMs) {
    const periodMs = 5 * 60 * 1000;
    return Math.floor(timestampMs / periodMs) * periodMs;
  }

  setHistoricalCandles(symbol, candles) {
    const sym = symbol.toUpperCase();
    // Sort ascending by timestamp
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    this.symbolCandles.set(sym, {
      completed: sorted,
      current: null
    });
  }

  getCompletedCandles(symbol) {
    const data = this.symbolCandles.get(symbol.toUpperCase());
    return data ? data.completed : [];
  }

  getCurrentCandle(symbol) {
    const data = this.symbolCandles.get(symbol.toUpperCase());
    return data ? data.current : null;
  }

  getAllCandles(symbol) {
    const data = this.symbolCandles.get(symbol.toUpperCase());
    if (!data) return [];
    return data.current ? [...data.completed, data.current] : [...data.completed];
  }

  /**
   * Process a live tick / price update
   * Returns { candleUpdated, newCandleFinalized, currentCandle, prevFinalizedCandle }
   */
  processTick(symbol, price, volume = 0, timestampMs = Date.now()) {
    const sym = symbol.toUpperCase();
    if (!this.symbolCandles.has(sym)) {
      this.symbolCandles.set(sym, { completed: [], current: null });
    }

    const data = this.symbolCandles.get(sym);
    const candleTime = CandleService.get5mBucketTimestamp(timestampMs);

    let newCandleFinalized = false;
    let prevFinalizedCandle = null;

    if (!data.current) {
      // First candle initialization
      data.current = {
        timestamp: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      };
    } else if (data.current.timestamp === candleTime) {
      // Update existing 5-minute candle
      data.current.high = Math.max(data.current.high, price);
      data.current.low = Math.min(data.current.low, price);
      data.current.close = price;
      data.current.volume += volume;
    } else if (candleTime > data.current.timestamp) {
      // New 5-minute period arrived! Finalize previous candle
      prevFinalizedCandle = { ...data.current };
      data.completed.push(prevFinalizedCandle);
      newCandleFinalized = true;

      // Keep max 1000 historical candles in memory buffer
      if (data.completed.length > 1000) {
        data.completed.shift();
      }

      // Start new forming candle
      data.current = {
        timestamp: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      };
    }

    return {
      candleUpdated: true,
      newCandleFinalized,
      currentCandle: { ...data.current },
      prevFinalizedCandle
    };
  }
}

module.exports = CandleService;
