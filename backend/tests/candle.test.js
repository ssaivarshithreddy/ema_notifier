const test = require('node:test');
const assert = require('node:assert/strict');
const CandleService = require('../src/services/CandleService');

test('CandleService - 5m Bucket Timestamp Alignment', () => {
  // 19:42:15 UTC = 1759088535000 -> bucket start = 19:40:00 UTC
  const time = new Date('2026-09-28T19:42:15.000Z').getTime();
  const bucket = CandleService.get5mBucketTimestamp(time);

  const bucketDate = new Date(bucket);
  assert.equal(bucketDate.getUTCMinutes(), 40);
  assert.equal(bucketDate.getUTCSeconds(), 0);
});

test('CandleService - Aggregates Ticks into 5m Candle', () => {
  const service = new CandleService();
  const symbol = 'BTCUSD';
  const baseTime = new Date('2026-09-28T19:40:05.000Z').getTime();

  service.processTick(symbol, 80000, 1, baseTime);
  service.processTick(symbol, 80500, 2, baseTime + 1000);
  service.processTick(symbol, 79900, 0.5, baseTime + 2000);
  const res = service.processTick(symbol, 80200, 1.5, baseTime + 3000);

  const candle = res.currentCandle;
  assert.equal(candle.open, 80000);
  assert.equal(candle.high, 80500);
  assert.equal(candle.low, 79900);
  assert.equal(candle.close, 80200);
  assert.equal(candle.volume, 5);
});

test('CandleService - Finalizes Candle on New Period', () => {
  const service = new CandleService();
  const symbol = 'BTCUSD';
  const time1 = new Date('2026-09-28T19:40:05.000Z').getTime();
  const time2 = new Date('2026-09-28T19:45:01.000Z').getTime();

  service.processTick(symbol, 80000, 1, time1);
  const res = service.processTick(symbol, 81000, 1, time2);

  assert.equal(res.newCandleFinalized, true);
  assert.equal(res.prevFinalizedCandle.close, 80000);
  assert.equal(res.currentCandle.open, 81000);
  assert.equal(service.getCompletedCandles(symbol).length, 1);
});
