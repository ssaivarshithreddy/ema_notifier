const db = require('../db');

class NotificationLogModel {
  static async create(data) {
    const { alert_id, channel, status, error_message } = data;
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO notification_logs (alert_id, channel, status, error_message)
        VALUES ($1, $2, $3, $4)
        RETURNING *`;
      const res = await db.query(sql, [alert_id, channel, status, error_message || null]);
      return res.rows[0];
    }
    const store = db.getMemoryStore().notification_logs;
    const log = {
      id: store.length + 1,
      alert_id,
      channel,
      status,
      error_message: error_message || null,
      sent_at: new Date().toISOString()
    };
    store.unshift(log);
    return log;
  }

  static async getByAlertId(alert_id) {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM notification_logs WHERE alert_id = $1 ORDER BY sent_at DESC', [alert_id]);
      return res.rows;
    }
    return db.getMemoryStore().notification_logs.filter(n => n.alert_id === alert_id);
  }
}

module.exports = NotificationLogModel;
