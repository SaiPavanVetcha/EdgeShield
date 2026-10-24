import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Globe,
  RotateCw,
  Database,
  Save,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { useTelemetry } from '../hooks/useTelemetry';
import { DashboardSettings } from '../types';

const DEFAULT_SETTINGS: DashboardSettings = {
  cpuThreshold: 85,
  ramThreshold: 90,
  diskThreshold: 90,
  tempThreshold: 35,
  offlineMinutes: 3,
  timezone: 'Local',
  refreshInterval: 30,
};

export const SettingsPage: React.FC = () => {
  const { health, refreshAll } = useTelemetry();
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    try {
      const saved = localStorage.getItem('edgeshield_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pinging, setPinging] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('edgeshield_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setPinging(true);
    try {
      await refreshAll();
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">System & Dashboard Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure rule thresholds, telemetry refresh intervals, and Databricks lakehouse connectivity
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Alert Thresholds Editor */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Telemetry Alert Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CPU Sustained Utilization (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={settings.cpuThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, cpuThreshold: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">Default: 85% sustained load</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RAM Memory Utilization (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={settings.ramThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, ramThreshold: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">Default: 90% utilization</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Disk Space Utilization (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={settings.diskThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, diskThreshold: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">Default: 90% full</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ambient Temperature Threshold (°C)
              </label>
              <input
                type="number"
                min="20"
                max="80"
                value={settings.tempThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, tempThreshold: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">Default: 35°C</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Device Inactivity Offline Threshold (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.offlineMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, offlineMinutes: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500">Default: 3 minutes without telemetry</span>
            </div>
          </div>
        </div>

        {/* Card 2: Timezone & Auto-Refresh */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Globe className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Preferences & Display</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Timestamp Timezone Display
              </label>
              <select
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value as 'Local' | 'UTC' })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="Local">Local Browser Time ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Auto-Refresh Interval
              </label>
              <select
                value={settings.refreshInterval}
                onChange={(e) =>
                  setSettings({ ...settings, refreshInterval: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value={0}>Disabled (Manual refresh only)</option>
                <option value={10}>Every 10 seconds</option>
                <option value={30}>Every 30 seconds (Recommended)</option>
                <option value={60}>Every 1 minute</option>
                <option value={300}>Every 5 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Databricks Lakehouse Connection Diagnostic */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-slate-100">Databricks Lakehouse Diagnostic</h2>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={pinging}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin text-sky-400' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 text-[11px] block">Catalog</span>
              <span className="font-mono text-slate-200 font-semibold">{health?.catalog || 'edgeshield_lakehouse'}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 text-[11px] block">Schema</span>
              <span className="font-mono text-slate-200 font-semibold">{health?.schema_name || 'gold'}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 text-[11px] block">Warehouse Status</span>
              <span className="font-mono text-slate-200 capitalize font-semibold">{health?.warehouse_status || 'Checking...'}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 text-[11px] block">Last Query Latency</span>
              <span className="font-mono text-slate-200 font-semibold">{health?.last_query_ms ? `${health.last_query_ms} ms` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors shadow-lg shadow-sky-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
