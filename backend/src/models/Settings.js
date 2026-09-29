const db = require('../db');
const env = require('../config/env');

class SettingsModel {
  static async get() {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM settings WHERE id = 1');
      if (res.rows.length > 0) return res.rows[0];
    }
    return db.getMemoryStore().settings;
  }

  static async update(updates) {
    if (db.getIsConnected()) {
      const fields = [];
      const values = [];
      let idx = 1;

      const keys = [
        'timeframe', 'ema_period', 'touch_tolerance', 'reset_threshold',
        'cooldown_minutes', 'telegram_enabled', 'whatsapp_enabled',
        'ema_touch_enabled', 'cross_above_enabled', 'cross_below_enabled'
      ];

      keys.forEach(k => {
        if (updates[k] !== undefined) {
          fields.push(`${k} = $${idx++}`);
          values.push(updates[k]);
        }
      });

      if (fields.length === 0) return await this.get();

      fields.push(`updated_at = NOW()`);
      const sql = `UPDATE settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`;
      const res = await db.query(sql, values);
      return res.rows[0];
    }

    const s = db.getMemoryStore().settings;
    Object.assign(s, updates);
    return s;
  }
}

module.exports = SettingsModel;
