const MarketDataProvider = require('./MarketDataProvider');
const axios = require('axios');
const logger = require('../../utils/logger');

class ForexMarketProvider extends MarketDataProvider {
  constructor() {
    super('ForexMetals');
    this.subscribedSymbols = new Set();
    this.pollInterval = null;
    this.apiKey = (process.env.MARKET_DATA_API_KEY || '').trim();

    // Yahoo Finance Symbol Mapping for Spot Metals & Forex
    this.yahooSymbolMap = {
      'XAUUSD': 'PAXG-USD', // Spot Gold (1:1 Troy Ounce Gold)
      'XAGUSD': 'SI=F',     // Spot/Futures Silver
      'EURUSD': 'EURUSD=X',
      'GBPUSD': 'GBPUSD=X',
      'USDJPY': 'USDJPY=X',
      'AUDUSD': 'AUDUSD=X',
      'USDCHF': 'USDCHF=X',
      'NZDUSD': 'NZDUSD=X'
    };
  }

  getTwelveDataSymbol(symbol) {
    const upper = symbol.toUpperCase();
    if (upper.length === 6) {
      return `${upper.substring(0, 3)}/${upper.substring(3)}`;
    }
    return upper;
  }

  getYahooSymbol(symbol) {
    const upper = symbol.toUpperCase();
    return this.yahooSymbolMap[upper] || `${upper}=X`;
  }

  async connect() {
    if (this.connected) return;
    logger.info('[ForexMarketProvider] Connecting Forex/Metals live spot price feed...');
    this.connected = true;
    this.emit('status', { status: 'CONNECTED', provider: this.name });

    // Poll live prices every 3 seconds for active symbols
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollLivePrices(), 3000);
  }

  async disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.connected = false;
    this.emit('status', { status: 'DISCONNECTED', provider: this.name });
  }

  async subscribe(symbol) {
    this.subscribedSymbols.add(symbol.toUpperCase());
    if (!this.connected) {
      this.connect();
    }
    this.fetchSinglePrice(symbol.toUpperCase()).catch(err => {
      logger.warn(`[ForexMarketProvider] Initial price fetch error for ${symbol}: ${err.message}`);
    });
  }

  async unsubscribe(symbol) {
    this.subscribedSymbols.delete(symbol.toUpperCase());
    if (this.subscribedSymbols.size === 0) {
      this.disconnect();
    }
  }

  async pollLivePrices() {
    if (!this.connected || this.subscribedSymbols.size === 0) return;
    const symbols = Array.from(this.subscribedSymbols);
    for (const sym of symbols) {
      await this.fetchSinglePrice(sym);
    }
  }

  async fetchSinglePrice(symbol) {
    const sym = symbol.toUpperCase();
    this.apiKey = (process.env.MARKET_DATA_API_KEY || '').trim();

    // 1. Primary: Twelve Data API if API key is provided
    if (this.apiKey) {
      try {
        const tdSym = this.getTwelveDataSymbol(sym);
        const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSym)}&apikey=${this.apiKey}`;
        const resp = await axios.get(url, { timeout: 4000 });
        if (resp.data && resp.data.price) {
          const price = parseFloat(resp.data.price);
          if (!isNaN(price)) {
            this.emit('price', {
              symbol: sym,
              price,
              volume: 0,
              timestamp: Date.now(),
              provider: 'Twelve Data Spot'
            });
            return;
          }
        }
      } catch (err) {
        logger.warn(`[ForexMarketProvider] TwelveData live price fetch failed for ${sym}: ${err.message}`);
      }
    }

    // 2. Spot FX API for XAUUSD / XAGUSD
    try {
      if (sym === 'XAUUSD' || sym === 'XAGUSD') {
        const res = await axios.get('https://api.fxratesapi.com/latest', { timeout: 4000 });
        const rates = res.data?.rates;
        if (rates && rates.XAU && sym === 'XAUUSD') {
          const spotGoldPrice = parseFloat((1 / rates.XAU).toFixed(2));
          this.emit('price', {
            symbol: sym,
            price: spotGoldPrice,
            volume: 0,
            timestamp: Date.now(),
            provider: 'Spot FX Feed'
          });
          return;
        } else if (rates && rates.XAG && sym === 'XAGUSD') {
          const spotSilverPrice = parseFloat((1 / rates.XAG).toFixed(3));
          this.emit('price', {
            symbol: sym,
            price: spotSilverPrice,
            volume: 0,
            timestamp: Date.now(),
            provider: 'Spot FX Feed'
          });
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // 3. Fallback: Yahoo Finance Chart API
    try {
      const ySym = this.getYahooSymbol(sym);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?range=1d&interval=1m`;
      const resp = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 4000
      });

      const result = resp.data?.chart?.result?.[0];
      if (!result) return;

      const meta = result.meta;
      const rawPrice = meta.regularMarketPrice || meta.chartPreviousClose;
      const timestamp = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;

      if (rawPrice != null && !isNaN(rawPrice)) {
        let price = parseFloat(rawPrice);
        this.emit('price', {
          symbol: sym,
          price,
          volume: meta.regularMarketVolume || 0,
          timestamp,
          provider: this.name
        });
      }
    } catch (err) {
      logger.warn(`[ForexMarketProvider] Yahoo tick query failed for ${sym}: ${err.message}`);
    }
  }

  async fetchHistoricalCandles(symbol, interval = '5m', limit = 300) {
    const sym = symbol.toUpperCase();
    this.apiKey = (process.env.MARKET_DATA_API_KEY || '').trim();

    // 1. Twelve Data API if API key is provided
    if (this.apiKey) {
      try {
        const tdSym = this.getTwelveDataSymbol(sym);
        const tdUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSym)}&interval=5min&outputsize=${limit}&apikey=${this.apiKey}`;
        const resp = await axios.get(tdUrl, { timeout: 10000 });
        if (resp.data && resp.data.values && Array.isArray(resp.data.values)) {
          return resp.data.values.map(v => ({
            timestamp: new Date(v.datetime).getTime(),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: parseFloat(v.volume || 0)
          })).reverse();
        }
      } catch (err) {
        logger.warn(`[ForexMarketProvider] TwelveData historical candles fetch failed (${err.message}). Falling back...`);
      }
    }

    // 2. Binance PAXGUSDT for Spot Gold historical 5m candles if XAUUSD
    if (sym === 'XAUUSD') {
      try {
        const resp = await axios.get(`https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=${limit}`, { timeout: 8000 });
        if (Array.isArray(resp.data)) {
          return resp.data.map(k => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
        }
      } catch (e) {
        // fallback to Yahoo
      }
    }

    // 3. Yahoo Finance Chart API Fallback
    try {
      const ySym = this.getYahooSymbol(sym);
      const range = limit > 200 ? '7d' : '3d';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?range=${range}&interval=5m`;
      const resp = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 10000
      });

      const result = resp.data?.chart?.result?.[0];
      if (!result || !result.timestamp) {
        throw new Error(`No chart result returned for ${sym}`);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const candles = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (quote && quote.close && quote.close[i] != null && !isNaN(quote.close[i])) {
          candles.push({
            timestamp: timestamps[i] * 1000,
            open: parseFloat(quote.open[i] || quote.close[i]),
            high: parseFloat(quote.high[i] || quote.close[i]),
            low: parseFloat(quote.low[i] || quote.close[i]),
            close: parseFloat(quote.close[i]),
            volume: parseFloat(quote.volume[i] || 0)
          });
        }
      }

      return candles.slice(-limit);
    } catch (err) {
      logger.error(`[ForexMarketProvider] Historical candles query failed for ${sym}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = ForexMarketProvider;
