const test = require('node:test');
const assert = require('node:assert/strict');
const EMAService = require('../src/services/EMAService');

test('EMAService - Period 200 Multiplier', () => {
  const emaService = new EMAService(200);
  const expectedMultiplier = 2 / 201;
  assert.equal(emaService.multiplier, expectedMultiplier);
});

test('EMAService - Insufficient Candles Return False', () => {
  const emaService = new EMAService(200);
  const candles = Array.from({ length: 150 }, (_, i) => ({ timestamp: i * 300000, close: 100 }));
  const result = emaService.calculateLatest(candles, 100, 200);
  assert.equal(result.hasSufficientData, false);
  assert.equal(result.latestCompletedEMA, null);
});

test('EMAService - 200 Completed Candles SMA Calculation', () => {
  const emaService = new EMAService(200);
  // 200 candles all with close 100
  const candles = Array.from({ length: 200 }, (_, i) => ({ timestamp: i * 300000, close: 100 }));
  const result = emaService.calculateLatest(candles, 100, 200);
  assert.equal(result.hasSufficientData, true);
  assert.ok(Math.abs(result.latestCompletedEMA - 100) < 1e-6);
  assert.ok(Math.abs(result.liveEMA - 100) < 1e-6);
});

test('EMAService - Live Price Updates EMA correctly', () => {
  const emaService = new EMAService(200);
  const candles = Array.from({ length: 200 }, (_, i) => ({ timestamp: i * 300000, close: 100 }));

  // Live price = 105
  const result = emaService.calculateLatest(candles, 105, 200);
  // mult = 2 / 201 = 0.00995024875721393
  // liveEMA = 105 * mult + 100 * (1 - mult) = 100.04975...
  assert.ok(result.liveEMA > 100);
  assert.ok(result.liveEMA < 101);
});
