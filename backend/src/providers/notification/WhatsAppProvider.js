const NotificationProvider = require('./NotificationProvider');
const axios = require('axios');
const logger = require('../../utils/logger');
const TelegramProvider = require('./TelegramProvider');

class WhatsAppProvider extends NotificationProvider {
  constructor() {
    super('WhatsApp');
  }

  isConfigured() {
    return Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_API_URL
    );
  }

  async sendAlert(alertData) {
    if (!this.isConfigured()) {
      logger.warn('[WhatsAppProvider] WhatsApp credentials missing in environment');
      return { success: false, error: 'WhatsApp credentials missing' };
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const baseUrl = process.env.WHATSAPP_API_URL;
    const recipientPhone = process.env.WHATSAPP_RECIPIENT_PHONE || process.env.TELEGRAM_CHAT_ID;

    const timeIST = TelegramProvider.formatTimeIST(alertData.created_at || Date.now());
    const eventName = alertData.event_type.replace('_', ' ');

    const bodyText = `🚨 *EMA 200 ALERT*\n\nSymbol: ${alertData.symbol}\nTimeframe: ${alertData.timeframe || '5m'}\nEvent: EMA 200 ${eventName}\nPrice: ${alertData.price}\nEMA 200: ${alertData.ema_value}\nDistance: ${Number(alertData.distance_percentage).toFixed(2)}%\nDirection: ${alertData.direction}\nTime: ${timeIST}`;

    const url = `${baseUrl}/${phoneId}/messages`;

    try {
      const resp = await axios.post(url, {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body: bodyText }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (resp.data && (resp.data.messages || resp.data.id)) {
        logger.info(`[WhatsAppProvider] Alert sent to WhatsApp for ${alertData.symbol}`);
        return { success: true, messageId: resp.data.messages?.[0]?.id };
      } else {
        throw new Error('WhatsApp API error');
      }
    } catch (err) {
      logger.error(`[WhatsAppProvider] Failed to send WhatsApp alert: ${err.message}`);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }
}

module.exports = WhatsAppProvider;
