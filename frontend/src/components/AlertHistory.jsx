import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter, RefreshCw, Bell, ArrowUpRight, ArrowDownRight, Send } from 'lucide-react';

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterSymbol) params.symbol = filterSymbol;
      if (filterEventType) params.event_type = filterEventType;

      const resp = await axios.get('/api/alerts', { params });
      if (resp.data && resp.data.success) {
        setAlerts(resp.data.data);
      }
    } catch (err) {
      console.error('Failed fetching alerts history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterSymbol, filterEventType]);

  const formatUTC3 = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Riyadh', // UTC+3
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        hour12: false
      }).format(d) + ' UTC+3';
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100 uppercase">
            ALERT LOG HISTORY
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Historical log of all triggered EMA 200 touch and cross events (UTC+3)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-400">Filters:</span>
          </div>

          <input
            type="text"
            placeholder="Symbol (e.g. SOLUSD)"
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 uppercase placeholder-slate-600 focus:outline-none focus:border-blue-500 w-36"
          />

          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Event Types</option>
            <option value="EMA_TOUCH">EMA Touch</option>
            <option value="CROSS_ABOVE">Cross Above</option>
            <option value="CROSS_BELOW">Cross Below</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Refresh Alert History"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 uppercase tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Time (UTC+3)</th>
                <th className="py-3.5 px-6 font-semibold">Symbol</th>
                <th className="py-3.5 px-6 font-semibold">Event</th>
                <th className="py-3.5 px-6 font-semibold text-right">Price</th>
                <th className="py-3.5 px-6 font-semibold text-right">EMA 200</th>
                <th className="py-3.5 px-6 font-semibold text-right">Distance</th>
                <th className="py-3.5 px-6 font-semibold text-center">Direction</th>
                <th className="py-3.5 px-6 font-semibold text-center">Notification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Fetching alert history...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No alert history records found.
                  </td>
                </tr>
              ) : (
                alerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                      {formatUTC3(item.created_at)}
                    </td>

                    <td className="py-4 px-6 font-bold text-slate-100">
                      {item.symbol}
                    </td>

                    <td className="py-4 px-6 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.event_type === 'EMA_TOUCH'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : item.event_type === 'CROSS_ABOVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {item.event_type?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-bold text-slate-100">
                      {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-6 text-right font-bold text-amber-400">
                      {Number(item.ema_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-6 text-right font-bold text-slate-200">
                      {Number(item.distance_percentage).toFixed(2)}%
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        item.direction?.includes('ABOVE')
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}>
                        {item.direction}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">
                        <Send className="w-3 h-3 mr-1" />
                        {item.notification_status || 'SENT'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
