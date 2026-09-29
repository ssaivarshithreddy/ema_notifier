import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CheckCircle2, XCircle, Sliders, RefreshCw, AlertCircle } from 'lucide-react';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [newTimeframe, setNewTimeframe] = useState('5m');
  const [newEmaPeriod, setNewEmaPeriod] = useState(200);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const resp = await axios.get('/api/watchlist');
      if (resp.data && resp.data.success) {
        setWatchlist(resp.data.data);
      }
    } catch (err) {
      console.error('Failed fetching watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddSymbol = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    setErrorMsg('');
    const sym = newSymbol.trim().toUpperCase();

    try {
      const resp = await axios.post('/api/watchlist', {
        symbol: sym,
        timeframe: newTimeframe,
        ema_period: Number(newEmaPeriod)
      });

      if (resp.data && resp.data.success) {
        setNewSymbol('');
        fetchWatchlist();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const handleToggleEnable = async (symbol, currentEnabled) => {
    try {
      await axios.put(`/api/watchlist/${symbol}`, { enabled: !currentEnabled });
      fetchWatchlist();
    } catch (err) {
      console.error('Toggle enable error:', err);
    }
  };

  const handleRemoveSymbol = async (symbol) => {
    if (!window.confirm(`Are you sure you want to remove ${symbol} from watchlist?`)) return;
    try {
      await axios.delete(`/api/watchlist/${symbol}`);
      fetchWatchlist();
    } catch (err) {
      console.error('Remove symbol error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Symbol Form */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100 uppercase">
            WATCHLIST MANAGEMENT
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Configure monitored financial instruments, timeframes, and period settings
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-sm text-rose-400 bg-rose-950/60 border border-rose-800 p-3 rounded-lg font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddSymbol} className="flex flex-col sm:flex-row items-end gap-3 pt-2">
          <div className="w-full sm:w-48 space-y-1">
            <label className="text-xs font-mono text-slate-400 uppercase">Symbol</label>
            <input
              type="text"
              placeholder="e.g. BTCUSD"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 uppercase placeholder-slate-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="w-full sm:w-36 space-y-1">
            <label className="text-xs font-mono text-slate-400 uppercase">Timeframe</label>
            <select
              value={newTimeframe}
              onChange={(e) => setNewTimeframe(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>

          <div className="w-full sm:w-36 space-y-1">
            <label className="text-xs font-mono text-slate-400 uppercase">EMA Period</label>
            <input
              type="number"
              value={newEmaPeriod}
              onChange={(e) => setNewEmaPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              required
              min="10"
              max="500"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Instrument</span>
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 uppercase tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Symbol</th>
                <th className="py-3.5 px-6 font-semibold">Provider</th>
                <th className="py-3.5 px-6 font-semibold text-center">Timeframe</th>
                <th className="py-3.5 px-6 font-semibold text-center">EMA</th>
                <th className="py-3.5 px-6 font-semibold text-center">Enabled</th>
                <th className="py-3.5 px-6 font-semibold text-center">Live Status</th>
                <th className="py-3.5 px-6 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading watchlist configuration...
                  </td>
                </tr>
              ) : watchlist.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No instruments in watchlist.
                  </td>
                </tr>
              ) : (
                watchlist.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-100">{item.symbol}</td>
                    <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                      {item.provider || (item.symbol.includes('BTC') || item.symbol.includes('ETH') || item.symbol.includes('SOL') || item.symbol.includes('XRP') || item.symbol.includes('BNB') || item.symbol.includes('LINK') ? 'Binance Crypto' : 'Forex/Metals')}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-300">
                      {item.timeframe || '5m'}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-amber-400">
                      EMA {item.ema_period || 200}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleEnable(item.symbol, item.enabled)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer transition-colors ${
                          item.enabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {item.enabled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>DISABLED</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-xs text-slate-300 font-semibold">
                        {item.status || (item.enabled ? 'Monitoring' : 'Offline')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleRemoveSymbol(item.symbol)}
                        className="p-1.5 rounded-md text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Remove Instrument"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
