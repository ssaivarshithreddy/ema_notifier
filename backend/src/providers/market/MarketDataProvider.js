const EventEmitter = require('events');

class MarketDataProvider extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.connected = false;
    this.reconnecting = false;
  }

  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async subscribe(symbol) {
    throw new Error('subscribe() must be implemented by subclass');
  }

  async unsubscribe(symbol) {
    throw new Error('unsubscribe() must be implemented by subclass');
  }

  async fetchHistoricalCandles(symbol, interval = '5m', limit = 300) {
    throw new Error('fetchHistoricalCandles() must be implemented by subclass');
  }
}

module.exports = MarketDataProvider;
