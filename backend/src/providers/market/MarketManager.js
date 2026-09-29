const EventEmitter = require('events');
const CryptoMarketProvider = require('./CryptoMarketProvider');
const ForexMarketProvider = require('./ForexMarketProvider');
const logger = require('../../utils/logger');

class MarketManager extends EventEmitter {
  constructor() {
    super();
    this.cryptoProvider = new CryptoMarketProvider();
    this.forexProvider = new ForexMarketProvider();

    this.cryptoSymbols = new Set(['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'LINKUSD']);
    this.lastUpdateMap = new Map(); // symbol -> timestamp
    this.stalenessThresholdMs = 60 * 1000; // 60 seconds

    this.setupListeners();
  }

  isCrypto(symbol) {
    const sym = symbol.toUpperCase();
    return this.cryptoSymbols.has(sym) || sym.includes('USDT') || sym.startsWith('BTC') || sym.startsWith('ETH');
  }

  getProviderForSymbol(symbol) {
    return this.isCrypto(symbol) ? this.cryptoProvider : this.forexProvider;
  }

  setupListeners() {
    [this.cryptoProvider, this.forexProvider].forEach(provider => {
      provider.on('price', (data) => {
        this.lastUpdateMap.set(data.symbol.toUpperCase(), Date.now());
        this.emit('price', data);
      });

      provider.on('status', (data) => {
        this.emit('provider_status', data);
      });

      provider.on('error', (err) => {
        this.emit('error', { provider: provider.name, error: err });
      });
    });
  }

  async subscribe(symbol) {
    const provider = this.getProviderForSymbol(symbol);
    await provider.subscribe(symbol);
  }

  async unsubscribe(symbol) {
    const provider = this.getProviderForSymbol(symbol);
    await provider.unsubscribe(symbol);
  }

  async fetchHistoricalCandles(symbol, interval = '5m', limit = 300) {
    const provider = this.getProviderForSymbol(symbol);
    return await provider.fetchHistoricalCandles(symbol, interval, limit);
  }

  isStale(symbol) {
    const last = this.lastUpdateMap.get(symbol.toUpperCase());
    if (!last) return true;
    return (Date.now() - last) > this.stalenessThresholdMs;
  }

  getLastUpdate(symbol) {
    return this.lastUpdateMap.get(symbol.toUpperCase()) || null;
  }

  getStatus() {
    return {
      crypto: {
        connected: this.cryptoProvider.connected,
        reconnecting: this.cryptoProvider.reconnecting,
        subscribed: Array.from(this.cryptoProvider.subscribedSymbols)
      },
      forex: {
        connected: this.forexProvider.connected,
        reconnecting: this.forexProvider.reconnecting,
        subscribed: Array.from(this.forexProvider.subscribedSymbols)
      }
    };
  }
}

module.exports = MarketManager;
