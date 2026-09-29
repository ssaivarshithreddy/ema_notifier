require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  MARKET_DATA_API_KEY: process.env.MARKET_DATA_API_KEY || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  DEFAULT_TIMEFRAME: process.env.DEFAULT_TIMEFRAME || '5m',
  DEFAULT_EMA_PERIOD: parseInt(process.env.DEFAULT_EMA_PERIOD || '200', 10),
  TOUCH_TOLERANCE: parseFloat(process.env.TOUCH_TOLERANCE || '0.02'),
  RESET_THRESHOLD: parseFloat(process.env.RESET_THRESHOLD || '0.05'),
  ALERT_COOLDOWN_MINUTES: parseInt(process.env.ALERT_COOLDOWN_MINUTES || '15', 10)
};
