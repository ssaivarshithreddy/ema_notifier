import React, { useState, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { Activity, Radio, Wifi, Clock, Sliders, Bell, List, LayoutDashboard } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const { connectionStatus } = useRealtime();
  const [timeUTC3, setTimeUTC3] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const options = {
        timeZone: 'Asia/Riyadh', // Asia/Riyadh is UTC+3 (GMT+3)
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatted = new Intl.DateTimeFormat('en-GB', options).format(new Date());
      setTimeUTC3(`${formatted} UTC+3`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (connectionStatus === 'CONNECTED') return 'bg-emerald-500 text-emerald-400';
    if (connectionStatus === 'RECONNECTING') return 'bg-amber-500 text-amber-400';
    return 'bg-rose-500 text-rose-400';
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30 text-blue-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
                EMA 200 MONITOR
              </h1>
              <p className="text-xs text-slate-400 font-mono">Live Market Touch & Cross Alerts</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'watchlist'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Watchlist</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alert History</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Realtime Status Badges */}
          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="text-slate-400">System Status:</span>
              <span className="flex items-center text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-ping"></span>
                ONLINE
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="text-slate-400">Market Data:</span>
              <span className={`flex items-center font-semibold ${getStatusColor().split(' ')[1]}`}>
                <span className={`h-2 w-2 rounded-full inline-block mr-1.5 ${getStatusColor().split(' ')[0]}`}></span>
                {connectionStatus}
              </span>
            </div>

            <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{timeUTC3}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
