const MarketDataProvider = require('./MarketDataProvider');
const WebSocket = require('ws');
const axios = require('axios');
const logger = require('../../utils/logger');

class CryptoMarketProvider extends MarketDataProvider {
  constructor() {
    super('BinanceCrypto');
    this.ws = null;
    this.subscribedSymbols = new Set();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.symbolMap = {
      'BTCUSD': 'BTCUSDT',
      'ETHUSD': 'ETHUSDT',
      'SOLUSD': 'SOLUSDT',
      'XRPUSD': 'XRPUSDT',
      'BNBUSD': 'BNBUSDT',
      'LINKUSD': 'LINKUSDT'
    };
    this.reverseSymbolMap = {};
    Object.entries(this.symbolMap).forEach(([k, v]) => {
      this.reverseSymbolMap[v] = k;
    });
  }

  getBinanceSymbol(symbol) {
    const upper = symbol.toUpperCase();
    return this.symbolMap[upper] || (upper.endsWith('USD') ? upper + 'T' : upper);
  }

  getAppSymbol(binanceSymbol) {
    const upper = binanceSymbol.toUpperCase();
    return this.reverseSymbolMap[upper] || (upper.endsWith('USDT') ? upper.replace('USDT', 'USD') : upper);
  }

  async connect() {
    if (this.connected || this.ws) return;

    const streams = Array.from(this.subscribedSymbols)
      .map(s => `${this.getBinanceSymbol(s).toLowerCase()}@trade`)
      .join('/');

    const wsUrl = streams.length > 0
      ? `wss://stream.binance.com:9443/stream?streams=${streams}`
      : `wss://stream.binance.com:9443/ws/btcusdt@trade`;

    logger.info(`[CryptoMarketProvider] Connecting to Binance WS...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('[CryptoMarketProvider] Binance WebSocket connected');
        this.connected = true;
        this.reconnecting = false;
        this.emit('status', { status: 'CONNECTED', provider: this.name });

        // Start heartbeat ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.ping();
          }
        }, 30000);
      });

      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          const payload = parsed.data || parsed;
          if (payload.e === 'trade') {
            const rawSymbol = payload.s;
            const appSymbol = this.getAppSymbol(rawSymbol);
            const price = parseFloat(payload.p);
            const volume = parseFloat(payload.q);
            const timestamp = payload.T;

            this.emit('price', {
              symbol: appSymbol,
              price,
              volume,
              timestamp,
              provider: this.name
            });
          }
        } catch (err) {
          logger.error(`[CryptoMarketProvider] Message parsing error: ${err.message}`);
        }
      });

      this.ws.on('close', () => {
        logger.warn('[CryptoMarketProvider] Binance WS connection closed');
        this.connected = false;
        this.emit('status', { status: 'DISCONNECTED', provider: this.name });
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        logger.error(`[CryptoMarketProvider] WS error: ${err.message}`);
        this.emit('error', err);
      });

    } catch (err) {
      logger.error(`[CryptoMarketProvider] Connection error: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.emit('status', { status: 'RECONNECTING', provider: this.name });

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      logger.info('[CryptoMarketProvider] Reconnecting Binance WS...');
      this.ws = null;
      this.connect();
    }, 5000);
  }

  async disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  async subscribe(symbol) {
    this.subscribedSymbols.add(symbol.toUpperCase());
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const bSym = this.getBinanceSymbol(symbol).toLowerCase();
      const subMsg = {
        method: "SUBSCRIBE",
        params: [`${bSym}@trade`],
        id: Date.now()
      };
      this.ws.send(JSON.stringify(subMsg));
    } else if (!this.connected && !this.reconnecting) {
      this.connect();
    }
  }

  async unsubscribe(symbol) {
    this.subscribedSymbols.delete(symbol.toUpperCase());
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const bSym = this.getBinanceSymbol(symbol).toLowerCase();
      const unsubMsg = {
        method: "UNSUBSCRIBE",
        params: [`${bSym}@trade`],
        id: Date.now()
      };
      this.ws.send(JSON.stringify(unsubMsg));
    }
  }

  async fetchHistoricalCandles(symbol, interval = '5m', limit = 300) {
    const bSymbol = this.getBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${bSymbol}&interval=${interval}&limit=${limit}`;

    try {
      const resp = await axios.get(url, { timeout: 10000 });
      // Format: [openTime, open, high, low, close, volume, closeTime, ...]
      return resp.data.map(k => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
    } catch (err) {
      logger.error(`[CryptoMarketProvider] Historical fetch failed for ${symbol}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = CryptoMarketProvider;
