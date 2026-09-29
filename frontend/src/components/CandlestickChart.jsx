import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function CandlestickChart({ candles = [], emaSeries = [] }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create TradingView Lightweight Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Add EMA Line Series (Orange / Gold)
    const emaLineSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 200',
    });

    // Format Candlesticks data for lightweight-charts
    const formattedCandles = candles.map(c => ({
      time: Math.floor(c.timestamp / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })).sort((a, b) => a.time - b.time);

    // Filter duplicates
    const uniqueCandles = [];
    const seenTimes = new Set();
    formattedCandles.forEach(c => {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        uniqueCandles.push(c);
      }
    });

    candleSeries.setData(uniqueCandles);

    // Format EMA series
    const formattedEMA = emaSeries.map(e => ({
      time: Math.floor(e.timestamp / 1000),
      value: e.ema,
    })).sort((a, b) => a.time - b.time);

    const uniqueEMA = [];
    const seenEmaTimes = new Set();
    formattedEMA.forEach(e => {
      if (!seenEmaTimes.has(e.time)) {
        seenEmaTimes.add(e.time);
        uniqueEMA.push(e);
      }
    });

    emaLineSeries.setData(uniqueEMA);

    // Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, emaSeries]);

  return (
    <div className="w-full relative rounded-lg border border-slate-800 overflow-hidden bg-slate-950 p-2">
      <div className="flex items-center justify-between mb-2 px-2 text-xs font-mono text-slate-400">
        <span className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-emerald-500 rounded-xs inline-block"></span>
          <span>5m Candles</span>
        </span>
        <span className="flex items-center space-x-2">
          <span className="w-4 h-0.5 bg-amber-500 inline-block"></span>
          <span className="text-amber-400 font-semibold">EMA 200 Overlay</span>
        </span>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
