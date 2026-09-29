const test = require('node:test');
const assert = require('node:assert/strict');
const TelegramProvider = require('../src/providers/notification/TelegramProvider');

test('TelegramProvider - Message Formatting and IST Time formatting', () => {
  const provider = new TelegramProvider();
  const dateObj = new Date('2026-09-28T14:12:15.000Z'); // 19:42:15 IST

  const alert = {
    symbol: 'SOLUSD',
    timeframe: '5m',
    event_type: 'EMA_TOUCH',
    price: 119.89,
    ema_value: 119.77,
    distance_percentage: 0.10,
    direction: 'ABOVE EMA',
    created_at: dateObj
  };

  const message = provider.formatMessageHTML(alert);

  assert.ok(message.includes('SOLUSD'));
  assert.ok(message.includes('119.89'));
  assert.ok(message.includes('119.77'));
  assert.ok(message.includes('0.10%'));
  assert.ok(message.includes('ABOVE EMA'));
  assert.ok(message.includes('UTC+3'));
});
