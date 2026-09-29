const logger = require('../utils/logger');

class AlertDetectionService {
  constructor() {
    // Map symbol -> { state: 'NORMAL'|'APPROACHING'|'WAIT_FOR_RESET', lastAlertTime: timestamp, prevPrice: number }
    this.symbolStates = new Map();
  }

  getSymbolState(symbol) {
    const sym = symbol.toUpperCase();
    if (!this.symbolStates.has(sym)) {
      this.symbolStates.set(sym, {
        state: 'NORMAL',
        lastAlertTime: 0,
        prevPrice: null
      });
    }
    return this.symbolStates.get(sym);
  }

  /**
   * Evaluate price against EMA value and settings.
   * Returns { triggered: boolean, eventType: string|null, direction: string, distancePercentage: number, reason: string|null }
   */
  evaluate({ symbol, currentPrice, emaValue, settings }) {
    if (!currentPrice || !emaValue || emaValue <= 0) {
      return { triggered: false };
    }

    const price = Number(currentPrice);
    const ema = Number(emaValue);
    const stateObj = this.getSymbolState(symbol);
    const prevPrice = stateObj.prevPrice;

    // Save current price as prevPrice for next tick
    stateObj.prevPrice = price;

    const distancePercentage = (Math.abs(price - ema) / ema) * 100;
    const direction = price >= ema ? 'ABOVE' : 'BELOW';

    const touchTolerance = Number(settings.touch_tolerance ?? 0.02);
    const resetThreshold = Number(settings.reset_threshold ?? 0.05);
    const cooldownMs = (Number(settings.cooldown_minutes ?? 15)) * 60 * 1000;
    const now = Date.now();

    // Check Reset State Machine Transition
    if (stateObj.state === 'WAIT_FOR_RESET') {
      const cooldownPassed = (now - stateObj.lastAlertTime) >= cooldownMs;
      const movedAway = distancePercentage >= resetThreshold;

      if (cooldownPassed && movedAway) {
        logger.info(`[AlertDetectionService] ${symbol} state reset to NORMAL (Distance: ${distancePercentage.toFixed(4)}% >= ${resetThreshold}%)`);
        stateObj.state = 'NORMAL';
      } else {
        // Still in WAIT_FOR_RESET, do not trigger alert
        return {
          triggered: false,
          state: stateObj.state,
          distancePercentage,
          direction,
          reason: !cooldownPassed ? 'In cooldown period' : 'Waiting for reset threshold'
        };
      }
    }

    // Check approaching state
    if (stateObj.state === 'NORMAL' && distancePercentage <= (touchTolerance * 3)) {
      stateObj.state = 'APPROACHING';
    }

    // Event Detection
    let isCrossAbove = false;
    let isCrossBelow = false;
    let isTouch = distancePercentage <= touchTolerance;

    if (prevPrice !== null) {
      if (prevPrice < ema && price >= ema) {
        isCrossAbove = true;
      } else if (prevPrice > ema && price <= ema) {
        isCrossBelow = true;
      }
    }

    let detectedEventType = null;

    if (isCrossAbove && settings.cross_above_enabled !== false) {
      detectedEventType = 'CROSS_ABOVE';
    } else if (isCrossBelow && settings.cross_below_enabled !== false) {
      detectedEventType = 'CROSS_BELOW';
    } else if (isTouch && settings.ema_touch_enabled !== false) {
      detectedEventType = 'EMA_TOUCH';
    }

    if (detectedEventType) {
      // Cooldown check
      if ((now - stateObj.lastAlertTime) < cooldownMs) {
        return {
          triggered: false,
          state: stateObj.state,
          distancePercentage,
          direction,
          reason: 'Cooldown active'
        };
      }

      // Valid alert triggered! Update state machine to WAIT_FOR_RESET
      stateObj.state = 'WAIT_FOR_RESET';
      stateObj.lastAlertTime = now;

      logger.info(`[AlertDetectionService] ALERT TRIGGERED for ${symbol}: ${detectedEventType} at Price: ${price}, EMA: ${ema} (Distance: ${distancePercentage.toFixed(4)}%)`);

      return {
        triggered: true,
        eventType: detectedEventType,
        price,
        emaValue: ema,
        distancePercentage: parseFloat(distancePercentage.toFixed(4)),
        direction: `${direction} EMA`,
        state: 'WAIT_FOR_RESET'
      };
    }

    return {
      triggered: false,
      state: stateObj.state,
      distancePercentage: parseFloat(distancePercentage.toFixed(4)),
      direction
    };
  }
}

module.exports = AlertDetectionService;
