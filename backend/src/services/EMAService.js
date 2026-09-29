class EMAService {
  constructor(period = 200) {
    this.period = period;
    this.multiplier = 2 / (period + 1);
  }

  /**
   * Calculate EMA array for an array of completed candles.
   * Returns array of { timestamp, close, ema }
   */
  calculateSeries(candles, period = this.period) {
    if (!candles || candles.length < period) {
      return [];
    }

    const mult = 2 / (period + 1);
    const result = [];

    // Step 1: Initial SMA for the first `period` candles
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += Number(candles[i].close);
    }
    let prevEMA = sum / period;

    result.push({
      timestamp: candles[period - 1].timestamp,
      close: Number(candles[period - 1].close),
      ema: prevEMA
    });

    // Step 2: Exponential moving average for subsequent candles
    for (let i = period; i < candles.length; i++) {
      const close = Number(candles[i].close);
      const ema = close * mult + prevEMA * (1 - mult);
      result.push({
        timestamp: candles[i].timestamp,
        close: close,
        ema: ema
      });
      prevEMA = ema;
    }

    return result;
  }

  /**
   * Get latest completed EMA and live EMA for current price
   */
  calculateLatest(completedCandles, currentPrice, period = this.period) {
    if (!completedCandles || completedCandles.length < period) {
      return {
        hasSufficientData: false,
        completedCount: completedCandles ? completedCandles.length : 0,
        requiredCount: period,
        latestCompletedEMA: null,
        liveEMA: null
      };
    }

    const series = this.calculateSeries(completedCandles, period);
    const latestCompletedEMA = series[series.length - 1].ema;

    const mult = 2 / (period + 1);
    const liveEMA = currentPrice != null
      ? Number(currentPrice) * mult + latestCompletedEMA * (1 - mult)
      : latestCompletedEMA;

    return {
      hasSufficientData: true,
      completedCount: completedCandles.length,
      requiredCount: period,
      latestCompletedEMA,
      liveEMA
    };
  }
}

module.exports = EMAService;
