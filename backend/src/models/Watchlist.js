const db = require('../db');

class WatchlistModel {
  static async getAll() {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM watchlist ORDER BY symbol ASC');
      return res.rows;
    }
    return db.getMemoryStore().watchlist;
  }

  static async getEnabled() {
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM watchlist WHERE enabled = true ORDER BY symbol ASC');
      return res.rows;
    }
    return db.getMemoryStore().watchlist.filter(w => w.enabled);
  }

  static async getBySymbol(symbol) {
    const sym = symbol.toUpperCase();
    if (db.getIsConnected()) {
      const res = await db.query('SELECT * FROM watchlist WHERE symbol = $1', [sym]);
      return res.rows[0] || null;
    }
    return db.getMemoryStore().watchlist.find(w => w.symbol === sym) || null;
  }

  static async add(symbol, timeframe = '5m', ema_period = 200) {
    const sym = symbol.toUpperCase();
    if (db.getIsConnected()) {
      const res = await db.query(
        `INSERT INTO watchlist (symbol, enabled, timeframe, ema_period)
         VALUES ($1, true, $2, $3)
         ON CONFLICT (symbol) DO UPDATE SET enabled = true, timeframe = $2, ema_period = $3, updated_at = NOW()
         RETURNING *`,
        [sym, timeframe, ema_period]
      );
      return res.rows[0];
    }
    const store = db.getMemoryStore().watchlist;
    let existing = store.find(w => w.symbol === sym);
    if (existing) {
      existing.enabled = true;
      existing.timeframe = timeframe;
      existing.ema_period = ema_period;
      return existing;
    }
    const newItem = { id: store.length + 1, symbol: sym, enabled: true, timeframe, ema_period };
    store.push(newItem);
    return newItem;
  }

  static async update(symbol, updates) {
    const sym = symbol.toUpperCase();
    if (db.getIsConnected()) {
      const fields = [];
      const values = [sym];
      let idx = 2;
      if (updates.enabled !== undefined) {
        fields.push(`enabled = $${idx++}`);
        values.push(updates.enabled);
      }
      if (updates.timeframe) {
        fields.push(`timeframe = $${idx++}`);
        values.push(updates.timeframe);
      }
      if (updates.ema_period) {
        fields.push(`ema_period = $${idx++}`);
        values.push(updates.ema_period);
      }
      fields.push(`updated_at = NOW()`);

      const sql = `UPDATE watchlist SET ${fields.join(', ')} WHERE symbol = $1 RETURNING *`;
      const res = await db.query(sql, values);
      return res.rows[0] || null;
    }
    const item = db.getMemoryStore().watchlist.find(w => w.symbol === sym);
    if (item) {
      if (updates.enabled !== undefined) item.enabled = updates.enabled;
      if (updates.timeframe) item.timeframe = updates.timeframe;
      if (updates.ema_period) item.ema_period = updates.ema_period;
    }
    return item || null;
  }

  static async remove(symbol) {
    const sym = symbol.toUpperCase();
    if (db.getIsConnected()) {
      const res = await db.query('DELETE FROM watchlist WHERE symbol = $1 RETURNING *', [sym]);
      return res.rows[0] || null;
    }
    const store = db.getMemoryStore().watchlist;
    const index = store.findIndex(w => w.symbol === sym);
    if (index !== -1) {
      const [removed] = store.splice(index, 1);
      return removed;
    }
    return null;
  }
}

module.exports = WatchlistModel;
