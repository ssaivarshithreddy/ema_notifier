import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw, CheckCircle2, Sliders, Bell, MessageSquare } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    timeframe: '5m',
    ema_period: 200,
    touch_tolerance: 0.02,
    reset_threshold: 0.05,
    cooldown_minutes: 15,
    telegram_enabled: true,
    whatsapp_enabled: false,
    ema_touch_enabled: true,
    cross_above_enabled: true,
    cross_below_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const resp = await axios.get('/api/settings');
      if (resp.data && resp.data.success) {
        setSettings(resp.data.data);
      }
    } catch (err) {
      console.error('Failed fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);
      const resp = await axios.put('/api/settings', settings);
      if (resp.data && resp.data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading engine settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Save Header */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wider text-slate-100 uppercase">
            ENGINE CONFIGURATION
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Customize EMA period, state machine thresholds, and alert channels
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings Saved</span>
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm font-semibold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Parameters */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="font-mono font-bold text-slate-100 uppercase text-sm">EMA & Candle Settings</h3>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Timeframe</label>
              <select
                value={settings.timeframe}
                onChange={(e) => handleChange('timeframe', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500"
              >
                <option value="5m">5 Minutes (Default)</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">EMA Period</label>
              <input
                type="number"
                value={settings.ema_period}
                onChange={(e) => handleChange('ema_period', parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500"
                min="10"
                max="500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Touch Tolerance (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings.touch_tolerance}
                onChange={(e) => handleChange('touch_tolerance', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500">Default: 0.02% (Triggers when price is within 0.02% ~ 0.03% of EMA)</span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Reset Threshold (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings.reset_threshold}
                onChange={(e) => handleChange('reset_threshold', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500">Default: 0.05%</span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Alert Cooldown (Minutes)</label>
              <input
                type="number"
                value={settings.cooldown_minutes}
                onChange={(e) => handleChange('cooldown_minutes', parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500"
                min="1"
                max="120"
              />
              <span className="text-[11px] text-slate-500">Default: 15 Minutes (Max 1 alert every 15 mins)</span>
            </div>
          </div>
        </div>

        {/* Notifications & Channels */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="font-mono font-bold text-slate-100 uppercase text-sm">Notification Channels</h3>
            </div>

            <div className="space-y-3 font-mono text-sm">
              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200">Telegram Bot</span>
                  <p className="text-xs text-slate-500">Primary instant notification channel</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.telegram_enabled)}
                  onChange={(e) => handleChange('telegram_enabled', e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200">WhatsApp Business API</span>
                  <p className="text-xs text-slate-500">Optional official Cloud API channel</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.whatsapp_enabled)}
                  onChange={(e) => handleChange('whatsapp_enabled', e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <h3 className="font-mono font-bold text-slate-100 uppercase text-sm">Alert Event Types</h3>
            </div>

            <div className="space-y-3 font-mono text-sm">
              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <span className="font-semibold text-amber-400">EMA Touch Alert</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.ema_touch_enabled)}
                  onChange={(e) => handleChange('ema_touch_enabled', e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <span className="font-semibold text-emerald-400">Cross Above Alert</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.cross_above_enabled)}
                  onChange={(e) => handleChange('cross_above_enabled', e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                <span className="font-semibold text-rose-400">Cross Below Alert</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.cross_below_enabled)}
                  onChange={(e) => handleChange('cross_below_enabled', e.target.checked)}
                  className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
