# EMA 200 Touch Alert - Market Monitoring Application

"EMA 200 Touch Alert" is a production-ready personal market-monitoring and notification system. The application continuously monitors live market prices for Forex, Metals, and Crypto instruments, aggregates tick prices into 5-minute candles, calculates real-time 200-period Exponential Moving Averages (EMA 200), detects touch/cross events using a robust state machine, and sends instant alerts via Telegram and optional WhatsApp.

---

## 1. Project Architecture

```
[ LIVE MARKET DATA PROVIDERS ]
  ├─ Binance WebSocket/REST (Crypto: BTCUSD, ETHUSD, SOLUSD, XRPUSD, BNBUSD, LINKUSD)
  └─ Forex Market Provider / Yahoo / Twelve Data (Forex/Metals: XAUUSD, XAGUSD, EURUSD, etc.)
           │
           ▼
[ MonitoringService ] ───► [ CandleEngine (5m aggregation) ]
           │                         │
           ▼                         ▼
[ EMA 200 Engine ] ◄────────── 300 Historical 5m Candles
           │
           ▼
[ AlertDetectionService ]
  ├─ State Machine: NORMAL -> APPROACHING -> TOUCHED/CROSSED -> ALERT_SENT -> WAIT_FOR_RESET
  ├─ Cooldown Filter (default 5 minutes)
  └─ Touch Tolerance (default 0.05%) & Reset Threshold (0.10%)
           │
           ▼
[ NotificationService ] ───────► PostgreSQL Database (watchlist, settings, alerts, notification_logs)
  ├─ TelegramProvider (Primary)
  └─ WhatsAppProvider (Optional Cloud API)
           │
           ▼
[ WebSocket Server ] ──────────► [ React / Vite Dark Dashboard & Lightweight Charts ]
```

---

## 2. Files Created

```
ema_notifier/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
│   │   ├── db/
│   │   │   ├── index.js
│   │   │   └── schema.sql
│   │   ├── providers/
│   │   │   ├── market/
│   │   │   │   ├── MarketDataProvider.js
│   │   │   │   ├── CryptoMarketProvider.js
│   │   │   │   ├── ForexMarketProvider.js
│   │   │   │   └── MarketManager.js
│   │   │   └── notification/
│   │   │       ├── NotificationProvider.js
│   │   │       ├── TelegramProvider.js
│   │   │       └── WhatsAppProvider.js
│   │   ├── services/
│   │   │   ├── CandleService.js
│   │   │   ├── EMAService.js
│   │   │   ├── AlertDetectionService.js
│   │   │   ├── NotificationService.js
│   │   │   └── MonitoringService.js
│   │   ├── models/
│   │   │   ├── Watchlist.js
│   │   │   ├── Settings.js
│   │   │   ├── Alert.js
│   │   │   └── NotificationLog.js
│   │   ├── routes/
│   │   │   ├── watchlist.js
│   │   │   ├── alerts.js
│   │   │   ├── settings.js
│   │   │   ├── candles.js
│   │   │   └── health.js
│   │   ├── websocket/
│   │   │   └── marketSocket.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js
│   ├── tests/
│   │   ├── ema.test.js
│   │   ├── candle.test.js
│   │   ├── alertDetection.test.js
│   │   └── telegram.test.js
│   ├── .env.example
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WatchlistPage.jsx
│   │   │   ├── AlertHistory.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── SymbolDetailModal.jsx
│   │   │   └── CandlestickChart.jsx
│   │   ├── context/
│   │   │   └── RealtimeContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── ecosystem.config.js
├── README.md
└── package.json
```

---

## 3. Technologies Used

- **Backend**: Node.js, Express.js, WebSocket (`ws`), PostgreSQL (`pg`), Axios.
- **Frontend**: React 18, Vite, Tailwind CSS v4, Lucide Icons, TradingView Lightweight Charts.
- **Market Data**: Binance WebSocket & REST API (Crypto), Twelve Data / Yahoo Chart API (Forex & Metals).
- **Notifications**: Telegram Bot API (Primary), WhatsApp Business Cloud API (Optional).
- **Testing**: Node.js test runner (`node --test`).
- **Process Manager**: PM2 (`ecosystem.config.js`).

---

## 4. Environment Variables Required

Save in `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL Database Connection
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ema_touch_db

# Market Data API (Optional key for TwelveData; Crypto Binance uses public endpoint)
MARKET_DATA_API_KEY=

# Telegram Bot Notifications (Primary)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=987654321

# WhatsApp Business API Notifications (Optional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Alert Engine Defaults
DEFAULT_TIMEFRAME=5m
DEFAULT_EMA_PERIOD=200
TOUCH_TOLERANCE=0.05
RESET_THRESHOLD=0.10
ALERT_COOLDOWN_MINUTES=5
```

---

## 5. Setup & Setup Instructions

### Database Setup (PostgreSQL)
Create database:
```sql
CREATE DATABASE ema_touch_db;
```
The application initializes `schema.sql` automatically upon server start.

### Telegram Setup Instructions
1. Message `@BotFather` on Telegram and create a new bot using `/newbot`.
2. Copy the token generated and set `TELEGRAM_BOT_TOKEN`.
3. Start a chat with your bot, send a message.
4. Obtain your Chat ID using `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` and set `TELEGRAM_CHAT_ID`.

### WhatsApp Setup Instructions
1. Register on Meta Developer Portal and setup WhatsApp Cloud API.
2. Obtain your Access Token and Phone Number ID.
3. Configure `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in `backend/.env`.

---

## 6. Local Run & Test Commands

### Run Backend Engine
```bash
cd backend
npm start
# Or for dev mode:
npm run dev
```

### Run Frontend Dashboard
```bash
cd frontend
npm run dev
```
Open browser at `http://localhost:3000`.

### Run Automated Unit Tests
```bash
cd backend
npm test
```

---

## 7. 24/7 Deployment with PM2

Start the backend monitoring engine continuously:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
Check status:
```bash
pm2 status
pm2 logs ema-200-monitor
```

---

## 8. Final Acceptance Workflow Verified

- Backend loads initial 14 instruments: `XAUUSD`, `XAGUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `AUDUSD`, `USDCHF`, `NZDUSD`, `XRPUSD`, `ETHUSD`, `BTCUSD`, `BNBUSD`, `LINKUSD`, `SOLUSD`.
- Loads 300 5-minute candles per symbol.
- Calculates initial 200 EMA.
- Subscribes to live Binance WS & Forex price ticks.
- Converts ticks into 5-minute candles and updates EMA.
- Evaluates Touch & Cross state machine with cooldown and reset logic.
- Dispatches Telegram notifications and saves alert records.
- Broadcasts real-time price & alert events via WebSockets to React Dark Dashboard.
