const NotificationProvider = require('./NotificationProvider');
const axios = require('axios');
const logger = require('../../utils/logger');

class TelegramProvider extends NotificationProvider {
  constructor() {
    super('Telegram');
  }

  getBotToken() {
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  }

  getChatId() {
    return (process.env.TELEGRAM_CHAT_ID || '').trim();
  }

  isConfigured() {
    return Boolean(this.getBotToken() && this.getChatId());
  }

  static formatTimeUTC3(dateInput = new Date()) {
    const d = new Date(dateInput);
    const options = {
      timeZone: 'Asia/Riyadh', // Asia/Riyadh is UTC+3 (GMT+3)
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formattedStr = new Intl.DateTimeFormat('en-GB', options).format(d);
    return `${formattedStr} UTC+3`;
  }

  formatMessageHTML(alert) {
    const timeUTC3 = TelegramProvider.formatTimeUTC3(alert.created_at || Date.now());
    const eventName = (alert.event_type || 'EMA_TOUCH').replace(/_/g, ' ');

    return `🚨 <b>EMA 200 ALERT</b>

<b>Symbol:</b> <code>${alert.symbol}</code>
<b>Timeframe:</b> ${alert.timeframe || '5m'}
<b>Event:</b> <b>EMA 200 ${eventName}</b>

<b>Price:</b> <code>${alert.price}</code>
<b>EMA 200:</b> <code>${alert.ema_value}</code>
<b>Distance:</b> ${Number(alert.distance_percentage).toFixed(2)}%
<b>Direction:</b> ${alert.direction}

<b>Time:</b> ${timeUTC3}`;
  }

  async sendAlert(alertData) {
    if (!this.isConfigured()) {
      logger.warn('[TelegramProvider] Bot token or Chat ID missing in environment');
      return { success: false, error: 'Telegram credentials missing' };
    }

    const token = this.getBotToken();
    const chatId = this.getChatId();

    // Check if user set TELEGRAM_CHAT_ID equal to Bot ID (token prefix)
    const botIdPrefix = token.split(':')[0];
    if (chatId === botIdPrefix) {
      const errReason = `TELEGRAM_CHAT_ID (${chatId}) is set to the Bot ID, not your personal User Chat ID! Please message @EMa20obot on Telegram and run 'npm run get-chat-id' inside backend directory to auto-fix.`;
      logger.error(`[TelegramProvider] ${errReason}`);
      return { success: false, error: errReason };
    }

    const messageHTML = this.formatMessageHTML(alertData);
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const resp = await axios.post(url, {
        chat_id: chatId,
        text: messageHTML,
        parse_mode: 'HTML'
      }, { timeout: 10000 });

      if (resp.data && resp.data.ok) {
        logger.info(`[TelegramProvider] Alert sent to Telegram for ${alertData.symbol}`);
        return { success: true, messageId: resp.data.result?.message_id };
      } else {
        throw new Error(resp.data?.description || 'Telegram API returned non-ok');
      }
    } catch (err) {
      const errMsg = err.response?.data?.description || err.message;
      logger.error(`[TelegramProvider] Failed to send Telegram alert to chat_id ${chatId}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

module.exports = TelegramProvider;
