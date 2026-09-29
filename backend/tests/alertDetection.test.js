const test = require('node:test');
const assert = require('node:assert/strict');
const AlertDetectionService = require('../src/services/AlertDetectionService');

const defaultSettings = {
  touch_tolerance: 0.02, // 0.02%
  reset_threshold: 0.05, // 0.05%
  cooldown_minutes: 15, // 15 minutes limit
  ema_touch_enabled: true,
  cross_above_enabled: true,
  cross_below_enabled: true
};

test('AlertDetection - EMA Touch / Cross Above within 0.02% range (EMA=100, prev=99, curr=100.015)', () => {
  const detector = new AlertDetectionService();

  // Tick 1 (prevPrice = 99)
  detector.evaluate({ symbol: 'TEST', currentPrice: 99, emaValue: 100, settings: defaultSettings });

  // Tick 2 (currPrice = 100.015 -> distance = 0.015% <= 0.02% range)
  const result = detector.evaluate({ symbol: 'TEST', currentPrice: 100.015, emaValue: 100, settings: defaultSettings });

  assert.equal(result.triggered, true);
  assert.equal(result.eventType, 'CROSS_ABOVE');
  assert.equal(result.price, 100.015);
});

test('AlertDetection - Cross Above (EMA=100, prev=99, curr=101)', () => {
  const detector = new AlertDetectionService();

  // Tick 1
  detector.evaluate({ symbol: 'TEST', currentPrice: 99, emaValue: 100, settings: defaultSettings });

  // Tick 2
  const result = detector.evaluate({ symbol: 'TEST', currentPrice: 101, emaValue: 100, settings: defaultSettings });

  assert.equal(result.triggered, true);
  assert.equal(result.eventType, 'CROSS_ABOVE');
  assert.equal(result.price, 101);
});

test('AlertDetection - Cross Below (EMA=100, prev=101, curr=99)', () => {
  const detector = new AlertDetectionService();

  // Tick 1
  detector.evaluate({ symbol: 'TEST', currentPrice: 101, emaValue: 100, settings: defaultSettings });

  // Tick 2
  const result = detector.evaluate({ symbol: 'TEST', currentPrice: 99, emaValue: 100, settings: defaultSettings });

  assert.equal(result.triggered, true);
  assert.equal(result.eventType, 'CROSS_BELOW');
  assert.equal(result.price, 99);
});

test('AlertDetection - 15-Minute Cooldown Prevents Notification Spam', () => {
  const detector = new AlertDetectionService();

  // Tick 1
  detector.evaluate({ symbol: 'TEST', currentPrice: 99, emaValue: 100, settings: defaultSettings });

  // Tick 2: Trigger initial alert
  const res1 = detector.evaluate({ symbol: 'TEST', currentPrice: 100.01, emaValue: 100, settings: defaultSettings });
  assert.equal(res1.triggered, true);

  // Tick 3: Price remains at 100.01 within 15 minutes
  const res2 = detector.evaluate({ symbol: 'TEST', currentPrice: 100.01, emaValue: 100, settings: defaultSettings });
  assert.equal(res2.triggered, false);

  // Tick 4: Price at 100.02 within 15 minutes
  const res3 = detector.evaluate({ symbol: 'TEST', currentPrice: 100.02, emaValue: 100, settings: defaultSettings });
  assert.equal(res3.triggered, false);
});
