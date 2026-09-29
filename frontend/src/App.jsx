import React, { useState } from 'react';
import { RealtimeProvider } from './context/RealtimeContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WatchlistPage from './components/WatchlistPage';
import AlertHistory from './components/AlertHistory';
import SettingsPage from './components/SettingsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'watchlist' && <WatchlistPage />}
          {activeTab === 'alerts' && <AlertHistory />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
          EMA 200 Touch Alert System &bull; Production Engine &bull; Timezone: UTC+3
        </footer>
      </div>
    </RealtimeProvider>
  );
}
