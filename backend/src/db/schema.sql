-- PostgreSQL Schema for EMA 200 Touch Alert Application

CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    timeframe VARCHAR(10) DEFAULT '5m',
    ema_period INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    timeframe VARCHAR(10) DEFAULT '5m',
    ema_period INTEGER DEFAULT 200,
    touch_tolerance NUMERIC(8, 4) DEFAULT 0.02,
    reset_threshold NUMERIC(8, 4) DEFAULT 0.05,
    cooldown_minutes INTEGER DEFAULT 15,
    telegram_enabled BOOLEAN DEFAULT TRUE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    ema_touch_enabled BOOLEAN DEFAULT TRUE,
    cross_above_enabled BOOLEAN DEFAULT TRUE,
    cross_below_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) DEFAULT '5m',
    ema_period INTEGER DEFAULT 200,
    price NUMERIC(18, 8) NOT NULL,
    ema_value NUMERIC(18, 8) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    distance_percentage NUMERIC(8, 4) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_enabled ON watchlist(enabled);

-- Initial Watchlist Seed
INSERT INTO watchlist (symbol, enabled, timeframe, ema_period) VALUES
('XAUUSD', true, '5m', 200),
('XAGUSD', true, '5m', 200),
('EURUSD', true, '5m', 200),
('GBPUSD', true, '5m', 200),
('USDJPY', true, '5m', 200),
('AUDUSD', true, '5m', 200),
('USDCHF', true, '5m', 200),
('NZDUSD', true, '5m', 200),
('XRPUSD', true, '5m', 200),
('ETHUSD', true, '5m', 200),
('BTCUSD', true, '5m', 200),
('BNBUSD', true, '5m', 200),
('LINKUSD', true, '5m', 200),
('SOLUSD', true, '5m', 200)
ON CONFLICT (symbol) DO NOTHING;

-- Initial Settings Seed
INSERT INTO settings (id, timeframe, ema_period, touch_tolerance, reset_threshold, cooldown_minutes, telegram_enabled, whatsapp_enabled, ema_touch_enabled, cross_above_enabled, cross_below_enabled)
VALUES (1, '5m', 200, 0.02, 0.05, 15, true, false, true, true, true)
ON CONFLICT (id) DO UPDATE SET touch_tolerance = 0.02, reset_threshold = 0.05, cooldown_minutes = 15;
