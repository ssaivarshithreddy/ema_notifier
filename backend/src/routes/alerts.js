const express = require('express');
const router = express.Router();
const AlertModel = require('../models/Alert');
const NotificationLogModel = require('../models/NotificationLog');

module.exports = function() {
  // GET /api/alerts
  router.get('/', async (req, res) => {
    try {
      const { symbol, event_type } = req.query;
      const alerts = await AlertModel.getAll({ symbol, event_type });

      // Fetch notification logs for each alert
      const withLogs = await Promise.all(
        alerts.map(async (alert) => {
          const logs = await NotificationLogModel.getByAlertId(alert.id);
          const telegramLog = logs.find(l => l.channel === 'Telegram');
          const whatsappLog = logs.find(l => l.channel === 'WhatsApp');

          let statusStr = 'Telegram SENT';
          if (telegramLog) {
            statusStr = `Telegram ${telegramLog.status}`;
          }
          if (whatsappLog) {
            statusStr += `, WhatsApp ${whatsappLog.status}`;
          }

          return {
            ...alert,
            price: Number(alert.price),
            ema_value: Number(alert.ema_value),
            distance_percentage: Number(alert.distance_percentage),
            notification_status: statusStr,
            logs
          };
        })
      );

      res.json({ success: true, data: withLogs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
