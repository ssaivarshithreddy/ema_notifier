const TelegramProvider = require('../providers/notification/TelegramProvider');
const WhatsAppProvider = require('../providers/notification/WhatsAppProvider');
const NotificationLogModel = require('../models/NotificationLog');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.telegramProvider = new TelegramProvider();
    this.whatsAppProvider = new WhatsAppProvider();
  }

  async sendNotifications(alertRecord, settings = {}) {
    const results = [];

    // Telegram Channel
    if (settings.telegram_enabled !== false) {
      if (this.telegramProvider.isConfigured()) {
        const res = await this.telegramProvider.sendAlert(alertRecord);
        const log = await NotificationLogModel.create({
          alert_id: alertRecord.id,
          channel: 'Telegram',
          status: res.success ? 'SENT' : 'FAILED',
          error_message: res.error || null
        });
        results.push({ channel: 'Telegram', ...res, logId: log.id });
      } else {
        const log = await NotificationLogModel.create({
          alert_id: alertRecord.id,
          channel: 'Telegram',
          status: 'SKIPPED',
          error_message: 'Telegram credentials missing'
        });
        results.push({ channel: 'Telegram', success: false, skipped: true, logId: log.id });
      }
    }

    // WhatsApp Channel
    if (settings.whatsapp_enabled === true) {
      if (this.whatsAppProvider.isConfigured()) {
        const res = await this.whatsAppProvider.sendAlert(alertRecord);
        const log = await NotificationLogModel.create({
          alert_id: alertRecord.id,
          channel: 'WhatsApp',
          status: res.success ? 'SENT' : 'FAILED',
          error_message: res.error || null
        });
        results.push({ channel: 'WhatsApp', ...res, logId: log.id });
      } else {
        const log = await NotificationLogModel.create({
          alert_id: alertRecord.id,
          channel: 'WhatsApp',
          status: 'SKIPPED',
          error_message: 'WhatsApp credentials missing'
        });
        results.push({ channel: 'WhatsApp', success: false, skipped: true, logId: log.id });
      }
    }

    return results;
  }
}

module.exports = NotificationService;
