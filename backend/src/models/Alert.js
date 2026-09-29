const db = require('../db');

class AlertModel {
  static async create(data) {
    const { symbol, timeframe, ema_period, price, ema_value, event_type, distance_percentage, direction } = data;
    if (db.getIsConnected()) {
      const sql = `
        INSERT INTO alerts (symbol, timeframe, ema_period, price, ema_value, event_type, distance_percentage, direction)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;
      const values = [symbol, timeframe || '5m', ema_period || 200, price, ema_value, event_type, distance_percentage, direction];
      const res = await db.query(sql, values);
      return res.rows[0];
    }
    const store = db.getMemoryStore().alerts;
    const alert = {
      id: store.length + 1,
      symbol,
      timeframe: timeframe || '5m',
      ema_period: ema_period || 200,
      price: Number(price),
      ema_value: Number(ema_value),
      event_type,
      distance_percentage: Number(distance_percentage),
      direction,
      created_at: new Date().toISOString()
    };
    store.unshift(alert);
    return alert;
  }

  static async getAll(filters = {}) {
    if (db.getIsConnected()) {
      const conditions = [];
      const values = [];
      let idx = 1;

      if (filters.symbol) {
        conditions.push(`symbol = $${idx++}`);
        values.push(filters.symbol.toUpperCase());
      }
      if (filters.event_type) {
        conditions.push(`event_type = $${idx++}`);
        values.push(filters.event_type);
      }

      let sql = 'SELECT * FROM alerts';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY created_at DESC LIMIT 100';

      const res = await db.query(sql, values);
      return res.rows;
    }

    let list = db.getMemoryStore().alerts;
    if (filters.symbol) {
      list = list.filter(a => a.symbol === filters.symbol.toUpperCase());
    }
    if (filters.event_type) {
      list = list.filter(a => a.event_type === filters.event_type);
    }
    return list.slice(0, 100);
  }

  static async getLatestForSymbol(symbol) {
    const list = await this.getAll({ symbol });
    return list[0] || null;
  }
}

module.exports = AlertModel;
