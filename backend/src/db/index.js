const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let pool = null;
let isConnected = false;
let memoryStore = {
  watchlist: [
    { id: 1, symbol: 'XAUUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 2, symbol: 'XAGUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 3, symbol: 'EURUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 4, symbol: 'GBPUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 5, symbol: 'USDJPY', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 6, symbol: 'AUDUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 7, symbol: 'USDCHF', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 8, symbol: 'NZDUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 9, symbol: 'XRPUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 10, symbol: 'ETHUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 11, symbol: 'BTCUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 12, symbol: 'BNBUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 13, symbol: 'LINKUSD', enabled: true, timeframe: '5m', ema_period: 200 },
    { id: 14, symbol: 'SOLUSD', enabled: true, timeframe: '5m', ema_period: 200 }
  ],
  settings: {
    id: 1,
    timeframe: '5m',
    ema_period: 200,
    touch_tolerance: 0.02,
    reset_threshold: 0.05,
    cooldown_minutes: 15,
    telegram_enabled: true,
    whatsapp_enabled: false,
    ema_touch_enabled: true,
    cross_above_enabled: true,
    cross_below_enabled: true
  },
  alerts: [],
  notification_logs: []
};

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.warn('DATABASE_URL not set. Running in memory database mode.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000
    });

    const client = await pool.connect();
    logger.info('Connected to PostgreSQL database');
    isConnected = true;

    // Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      logger.info('Database schema initialized');
    }
    client.release();
  } catch (err) {
    logger.warn(`PostgreSQL connection failed (${err.message}). Using memory fallback store.`);
    isConnected = false;
    pool = null;
  }
}

async function query(text, params) {
  if (isConnected && pool) {
    return pool.query(text, params);
  }
  throw new Error('Database pool not connected');
}

function getIsConnected() {
  return isConnected;
}

function getMemoryStore() {
  return memoryStore;
}

module.exports = {
  initDb,
  query,
  getIsConnected,
  getMemoryStore
};
