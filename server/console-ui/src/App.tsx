import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Terminal,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { consoleApi } from './api';
import {
  ConsoleStatusResponse,
  RegisteredDevice,
  FlushResponse,
  LogEntry,
} from './types';
import { OverviewTab } from './components/OverviewTab';
import { DevicesTab } from './components/DevicesTab';
import { SpoolTab } from './components/SpoolTab';
import { LogsTab } from './components/LogsTab';

export type TabKey = 'overview' | 'devices' | 'spool' | 'logs';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Server state
  const [status, setStatus] = useState<ConsoleStatusResponse | null>(null);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [deviceOnline, setDeviceOnline] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Loading & Action states
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastFlushResult, setLastFlushResult] = useState<FlushResponse | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live polling controls
  const [liveStreamLogs, setLiveStreamLogs] = useState(true);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const data = await consoleApi.getStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to load status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const data = await consoleApi.getDevices();
      setDevices(data.devices || []);
      setDeviceTotal(data.total || 0);
      setDeviceOnline(data.online || 0);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await consoleApi.getLogs(200);
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchDevices(), fetchLogs()]);
  }, [fetchStatus, fetchDevices, fetchLogs]);

  // Initial load
  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Status background poll every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatus();
      if (activeTab === 'devices') fetchDevices();
    }, 4000);
    return () => clearInterval(timer);
  }, [activeTab, fetchStatus, fetchDevices]);

  // Live stream logs poll every 2.5 seconds when active
  useEffect(() => {
    if (!liveStreamLogs || activeTab !== 'logs') return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 2500);
    return () => clearInterval(timer);
  }, [liveStreamLogs, activeTab, fetchLogs]);

  const handleSwitchMode = async (targetMode: 'local' | 'databricks') => {
    setIsSwitchingMode(true);
    try {
      const res = await consoleApi.setStorageMode(targetMode);
      setStatus(res.console_status);
      showNotification('success', `Storage mode switched to ${res.storage_mode.toUpperCase()}`);
      await fetchLogs();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to switch storage mode');
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleTriggerFlush = async () => {
    setIsFlushing(true);
    try {
      const res = await consoleApi.triggerFlush();
      setLastFlushResult(res);
      showNotification('success', res.message || 'Flush cycle triggered successfully');
      await Promise.all([fetchStatus(), fetchLogs()]);
      return res;
    } catch (err: any) {
      showNotification('error', err.message || 'Flush cycle failed');
    } finally {
      setIsFlushing(false);
    }
  };

  const pendingSpool = status?.pending ?? status?.spool?.pending ?? 0;
  const isLocal = status?.storage_mode === 'local';

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#0b1021]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20 text-sm border border-sky-400/30">
              ES
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  EdgeShield Server Console
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/50">
                  v1.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Ingest Control Plane &bull; {status?.host || '0.0.0.0'}:{status?.port || 5000}
              </p>
            </div>
          </div>

          {/* Status Badges & Controls */}
          <div className="flex items-center gap-3">
            {/* Server Online Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </div>

            {/* Storage Mode Badge */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isLocal
                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                : 'bg-sky-950/40 text-sky-300 border border-sky-800/40'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span className="capitalize">{status?.storage_mode || 'Loading...'} Mode</span>
            </div>

            {/* Refresh All Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isLoadingStatus}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              title="Refresh all data"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* External Link to Landing */}
            <a
              href="/"
              className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-900 transition-colors"
            >
              <span>Landing</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs px-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
          {/* Tab 1: Overview */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          {/* Tab 2: Devices */}
          <button
            onClick={() => {
              setActiveTab('devices');
              fetchDevices();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Devices</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'devices' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {deviceTotal}
            </span>
          </button>

          {/* Tab 3: Spool */}
          <button
            onClick={() => setActiveTab('spool')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'spool'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Spool Queue</span>
            {pendingSpool > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'spool' ? 'bg-indigo-700 text-white' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              }`}>
                {pendingSpool}
              </span>
            )}
          </button>

          {/* Tab 4: Logs */}
          <button
            onClick={() => {
              setActiveTab('logs');
              fetchLogs();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Logs</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <OverviewTab
              status={status}
              onSwitchMode={handleSwitchMode}
              isSwitchingMode={isSwitchingMode}
              onTriggerFlush={handleTriggerFlush}
              isFlushing={isFlushing}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                if (tab === 'devices') fetchDevices();
                if (tab === 'logs') fetchLogs();
              }}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesTab
              devices={devices}
              total={deviceTotal}
              online={deviceOnline}
              isLoading={isLoadingDevices}
              onRefresh={fetchDevices}
            />
          )}

          {activeTab === 'spool' && (
            <SpoolTab
              status={status}
              onTriggerFlush={handleTriggerFlush}
              isFlushing={isFlushing}
              lastFlushResult={lastFlushResult}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab
              logs={logs}
              isLoading={isLoadingLogs}
              onRefresh={fetchLogs}
              autoRefresh={liveStreamLogs}
              onToggleAutoRefresh={() => setLiveStreamLogs(!liveStreamLogs)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-xs text-slate-500 bg-[#060910]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EdgeShield Ops Control Plane &bull; Industrial Edge Observability</span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Storage: <strong className="text-slate-300 capitalize">{status?.storage_mode}</strong></span>
            <span>Spool: <strong className="text-slate-300">{pendingSpool} pending</strong></span>
            <span>Devices: <strong className="text-slate-300">{deviceOnline}/{deviceTotal} online</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
