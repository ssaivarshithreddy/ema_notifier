import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, RefreshCw, Activity, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CandlestickChart from './CandlestickChart';

export default function SymbolDetailModal({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`/api/candles/${symbol}`);
      if (resp.data && resp.data.success) {
        setData(resp.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchDetails();
      const interval = setInterval(fetchDetails, 5000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

  if (!symbol) return null;

  // Calculate live values directly from latest candle and EMA series for 100% chart alignment
  const latestCandle = data?.candles && data.candles.length > 0 ? data.candles[data.candles.length - 1] : null;
  const latestEMAObj = data?.emaSeries && data.emaSeries.length > 0 ? data.emaSeries[data.emaSeries.length - 1] : null;

  const currentPrice = latestCandle ? latestCandle.close : data?.price;
  const currentEMA = latestEMAObj ? latestEMAObj.ema : data?.ema200;

  const distance = (currentPrice != null && currentEMA != null && currentEMA > 0)
    ? parseFloat(((Math.abs(currentPrice - currentEMA) / currentEMA) * 100).toFixed(4))
    : (data?.distance ?? 0);

  const isAbove = (currentPrice != null && currentEMA != null)
    ? currentPrice >= currentEMA
    : (data?.direction?.includes('ABOVE') || false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold font-mono text-slate-100">{symbol}</h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30">
              5m Timeframe
            </span>
            {data?.provider && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {data.provider}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm font-mono text-slate-400">Loading 5-minute candles and EMA 200 data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/50 border border-rose-800/50 rounded-lg text-rose-300 text-sm">
              Failed to load instrument details: {error}
            </div>
          ) : data ? (
            <>
              {/* Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 mb-1">Current Price</div>
                  <div className="text-xl font-bold font-mono text-slate-100">
                    {currentPrice != null ? Number(currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 mb-1">EMA 200</div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {currentEMA != null ? Number(currentEMA).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 mb-1">Distance %</div>
                  <div className={`text-xl font-bold font-mono ${
                    distance <= 0.05 ? 'text-amber-400 font-extrabold animate-pulse' : 'text-slate-200'
                  }`}>
                    {distance != null ? `${isAbove ? '+' : '-'}${Number(distance).toFixed(2)}%` : '0%'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 mb-1">Direction / Status</div>
                  <div className="flex items-center space-x-1.5 text-sm font-semibold text-slate-200">
                    {isAbove ? (
                      <span className="text-emerald-400 flex items-center"><ArrowUpRight className="w-4 h-4 mr-0.5" /> Above EMA</span>
                    ) : (
                      <span className="text-rose-400 flex items-center"><ArrowDownRight className="w-4 h-4 mr-0.5" /> Below EMA</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <CandlestickChart candles={data.candles} emaSeries={data.emaSeries} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
