import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRealtime } from '../context/RealtimeContext';
import { Search, ArrowUpRight, ArrowDownRight, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import SymbolDetailModal from './SymbolDetailModal';

export default function Dashboard() {
  const { instrumentsMap } = useRealtime();
  const [initialData, setInitialData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const resp = await axios.get('/api/watchlist');
      if (resp.data && resp.data.success) {
        setInitialData(resp.data.data);
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

  // Merge REST watchlist data with live WebSocket instrumentsMap
  const mergedList = initialData.map(item => {
    const live = instrumentsMap[item.symbol];
    return {
      ...item,
      price: live?.price ?? item.price,
      ema200: live?.ema200 ?? item.ema200,
      distance: live?.distance ?? item.distance,
      direction: live?.direction ?? item.direction,
      status: live?.status ?? item.status ?? 'Monitoring',
      state: live?.state ?? item.state ?? 'NORMAL'
    };
  });

  const filtered = mergedList.filter(item =>
    item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Watchlist Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100 uppercase">
            WATCHLIST MONITORING
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Continuous 5-Minute Candle EMA 200 Touch & Cross Engine
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search instrument..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Trading Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 uppercase tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Symbol</th>
                <th className="py-3.5 px-6 font-semibold text-right">Price</th>
                <th className="py-3.5 px-6 font-semibold text-right">EMA 200</th>
                <th className="py-3.5 px-6 font-semibold text-right">Distance</th>
                <th className="py-3.5 px-6 font-semibold text-center">Direction</th>
                <th className="py-3.5 px-6 font-semibold text-center">Status</th>
                <th className="py-3.5 px-6 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Connecting to live market data feeds...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No matching instruments found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isAbove = item.direction?.includes('ABOVE') || item.direction?.includes('Above');
                  const isTouching = item.distance <= 0.03;
                  const isStale = item.status === 'DATA STALE';

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => setSelectedSymbol(item.symbol)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-bold text-slate-100 flex items-center space-x-2">
                        <span>{item.symbol}</span>
                        {item.symbol.includes('XAU') || item.symbol.includes('XAG') ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">METAL</span>
                        ) : item.symbol.includes('USD') && !item.symbol.includes('BTC') && !item.symbol.includes('ETH') && !item.symbol.includes('SOL') && !item.symbol.includes('XRP') && !item.symbol.includes('BNB') && !item.symbol.includes('LINK') ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">FOREX</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">CRYPTO</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right font-bold text-slate-200">
                        {item.price != null
                          ? Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </td>

                      <td className="py-4 px-6 text-right font-bold text-amber-400/90">
                        {item.ema200 != null
                          ? Number(item.ema200).toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </td>

                      <td className={`py-4 px-6 text-right font-bold ${
                        isTouching ? 'text-amber-400 animate-pulse font-black' : isAbove ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {item.distance != null ? `${isAbove ? '+' : '-'}${Number(item.distance).toFixed(2)}%` : '—'}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isAbove
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                        }`}>
                          {isAbove ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                              Above EMA
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
                              Below EMA
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {isStale ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            DATA STALE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-1.5 animate-ping"></span>
                            Monitoring
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSymbol(item.symbol);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Symbol Detail Modal */}
      {selectedSymbol && (
        <SymbolDetailModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
        />
      )}
    </div>
  );
}
