import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Globe,
  RotateCw,
  RotateCcw,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Info,
} from 'lucide-react';
import { useTelemetry } from '../hooks/useTelemetry';
import { DashboardSettings, AlertThresholds } from '../types';
import { api } from '../services/api';

const DEFAULT_SETTINGS: DashboardSettings = {
  cpuThreshold: 85,
  ramThreshold: 90,
  diskThreshold: 90,
  tempThreshold: 35,
  offlineMinutes: 3,
  timezone: 'Local',
  refreshInterval: 30,
};

const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  cpu_pct: 85.0,
  ram_pct: 90.0,
  disk_pct: 90.0,
  temperature_c: 35.0,
  battery_pct: 20.0,
  battery_health_pct: 60.0,
  offline_minutes: 3.0,
};

export const SettingsPage: React.FC = () => {
  const { health, refreshAll, distinctRooms } = useTelemetry();

  // Local browser preferences
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

  // Backend-backed alert thresholds state
  const [thresholdScope, setThresholdScope] = useState<string>('global');
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS);
  const [isCustomScope, setIsCustomScope] = useState<boolean>(false);
  const [availableScopes, setAvailableScopes] = useState<string[]>(['global']);
  const [isLoadingThresholds, setIsLoadingThresholds] = useState<boolean>(false);
  const [isSavingThresholds, setIsSavingThresholds] = useState<boolean>(false);
  const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState<string | null>(null);
  const [thresholdErrorMsg, setThresholdErrorMsg] = useState<string | null>(null);

  const loadThresholds = useCallback(async (scope: string) => {
    setIsLoadingThresholds(true);
    setThresholdErrorMsg(null);
    try {
      const res = await api.getAlertSettings(scope);
      setThresholds(res.thresholds);
      setIsCustomScope(res.is_custom);
      const combined = Array.from(new Set([...res.available_scopes, ...distinctRooms]));
      setAvailableScopes(combined);
    } catch (err: any) {
      setThresholdErrorMsg(err.message || 'Failed to load alert thresholds from backend');
    } finally {
      setIsLoadingThresholds(false);
    }
  }, [distinctRooms]);

  useEffect(() => {
    loadThresholds(thresholdScope);
  }, [thresholdScope, loadThresholds]);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingThresholds(true);
    setThresholdErrorMsg(null);
    try {
      const res = await api.updateAlertSettings(thresholdScope, thresholds);
      setThresholds(res.thresholds);
      setIsCustomScope(res.is_custom);
      setThresholdSuccessMsg(
        thresholdScope === 'global'
          ? 'Global alert thresholds saved successfully'
          : `Custom thresholds for room '${thresholdScope}' saved successfully`
      );
      setTimeout(() => setThresholdSuccessMsg(null), 3500);
    } catch (err: any) {
      setThresholdErrorMsg(err.message || 'Failed to update alert thresholds');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleResetThresholds = async () => {
    setIsSavingThresholds(true);
    setThresholdErrorMsg(null);
    try {
      const res = await api.resetAlertSettings(thresholdScope);
      setThresholds(res.thresholds);
      setIsCustomScope(res.is_custom);
      setThresholdSuccessMsg(
        thresholdScope === 'global'
          ? 'Global alert thresholds reset to default heuristics'
          : `Room override removed. Now inheriting global defaults for '${thresholdScope}'`
      );
      setTimeout(() => setThresholdSuccessMsg(null), 3500);
    } catch (err: any) {
      setThresholdErrorMsg(err.message || 'Failed to reset alert thresholds');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
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
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">System & Observability Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure rule-based alert thresholds, room overrides, client refresh rates, and lakehouse connectivity
        </p>
      </div>

      {/* Card 1: Alert Thresholds Editor with Scope Selector */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Telemetry Alert Thresholds</h2>
          </div>

          {/* Active Scope Badge */}
          <div className="text-xs">
            {thresholdScope === 'global' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/60 text-sky-300 border border-sky-800/60 font-mono text-[11px]">
                <Globe className="w-3 h-3 text-sky-400" />
                Active Scope: Global Default (All Rooms)
              </span>
            ) : isCustomScope ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-mono text-[11px]">
                <MapPin className="w-3 h-3 text-amber-400" />
                Active Scope: Room {thresholdScope} (Custom Override Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                <MapPin className="w-3 h-3 text-slate-400" />
                Active Scope: Room {thresholdScope} (Inheriting Global Defaults)
              </span>
            )}
          </div>
        </div>

        {/* Scope Selector Tabs */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Select Configuration Scope:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setThresholdScope('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                thresholdScope === 'global'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Global Default
            </button>
            {availableScopes
              .filter((s) => s.toLowerCase() !== 'global')
              .map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setThresholdScope(room)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    thresholdScope === room
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>Room: {room}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Notice Info Banner */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {thresholdScope === 'global'
              ? 'Global thresholds apply across the entire fleet to all edge nodes that do not have custom room-level overrides.'
              : `Thresholds set here specifically override global defaults for devices tagged with room '${thresholdScope}'. Use 'Reset to Defaults' to remove the override.`}
            {' '}Stored on backend via alert settings service (local JSON v1).
          </span>
        </div>

        {/* Form Inputs for 7 Rules */}
        <form onSubmit={handleSaveThresholds} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CPU Sustained Utilization (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="100"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.cpu_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, cpu_pct: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 85% sustained load</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RAM Memory Utilization (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="100"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.ram_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, ram_pct: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 90% utilization</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Disk Space Utilization (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="100"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.disk_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, disk_pct: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 90% full</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ambient Temperature Threshold (°C)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="80"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.temperature_c}
                onChange={(e) =>
                  setThresholds({ ...thresholds, temperature_c: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 35°C</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Battery Low Alert Level (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.battery_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, battery_pct: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 20% (battery hardware only)</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Battery Degradation Health (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.battery_health_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, battery_health_pct: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 60% health degradation</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Device Inactivity Offline Threshold (Minutes)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="1440"
                disabled={isLoadingThresholds || isSavingThresholds}
                value={thresholds.offline_minutes}
                onChange={(e) =>
                  setThresholds({ ...thresholds, offline_minutes: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-500">Default: 3 minutes without telemetry</span>
            </div>
          </div>

          {/* Messages & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {thresholdSuccessMsg && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {thresholdSuccessMsg}
                </span>
              )}
              {thresholdErrorMsg && (
                <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {thresholdErrorMsg}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetThresholds}
                disabled={isSavingThresholds || isLoadingThresholds}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="submit"
                disabled={isSavingThresholds || isLoadingThresholds}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSavingThresholds
                    ? 'Saving...'
                    : thresholdScope === 'global'
                    ? 'Save Global Thresholds'
                    : `Save Room (${thresholdScope}) Thresholds`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Card 2: Timezone & Auto-Refresh */}
      <form onSubmit={handleSavePreferences} className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
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

        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Display preferences saved
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors border border-slate-700"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

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
    </div>
  );
};
