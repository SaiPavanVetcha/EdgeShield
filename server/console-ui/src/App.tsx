import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Copy,
  Check,
  AlertTriangle,
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
import { BrandLogo } from './components/BrandLogo';

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
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Storage mode confirmation modal state
  const [showConfirmCloudModal, setShowConfirmCloudModal] = useState(false);

  // Live polling controls & in-flight guards
  const [liveStreamLogs, setLiveStreamLogs] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const inFlightStatusRef = useRef(false);
  const inFlightDevicesRef = useRef(false);
  const inFlightLogsRef = useRef(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchStatus = useCallback(async (isManual = false) => {
    if (inFlightStatusRef.current) return;
    inFlightStatusRef.current = true;
    if (isManual) setIsLoadingStatus(true);
    try {
      const data = await consoleApi.getStatus();
      setStatus(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load status:', err);
    } finally {
      setIsLoadingStatus(false);
      inFlightStatusRef.current = false;
    }
  }, []);

  const fetchDevices = useCallback(async (isManual = false) => {
    if (inFlightDevicesRef.current) return;
    inFlightDevicesRef.current = true;
    if (isManual) setIsLoadingDevices(true);
    try {
      const data = await consoleApi.getDevices();
      setDevices(data.devices || []);
      setDeviceTotal(data.total || 0);
      setDeviceOnline(data.online || 0);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load devices:', err);
    } finally {
      setIsLoadingDevices(false);
      inFlightDevicesRef.current = false;
    }
  }, []);

  const fetchLogs = useCallback(async (isManual = false) => {
    if (inFlightLogsRef.current) return;
    inFlightLogsRef.current = true;
    if (isManual) setIsLoadingLogs(true);
    try {
      const data = await consoleApi.getLogs(200);
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
      inFlightLogsRef.current = false;
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchStatus(true), fetchDevices(true), fetchLogs(true)]);
  }, [fetchStatus, fetchDevices, fetchLogs]);

  // Initial load
  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Visibility change listener: pause polling when hidden, resume immediately when visible
  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible) {
        fetchStatus();
        fetchDevices();
        if (activeTab === 'logs') fetchLogs();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchStatus, fetchDevices, fetchLogs, activeTab]);

  // Status & Devices background auto-polling every 4 seconds (single in-flight request per endpoint)
  useEffect(() => {
    const timer = setInterval(() => {
      // Pause polling when browser tab is hidden
      if (document.visibilityState === 'hidden') return;

      fetchStatus();
      fetchDevices();

      if (activeTab === 'logs' && liveStreamLogs) {
        fetchLogs();
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [fetchStatus, fetchDevices, fetchLogs, activeTab, liveStreamLogs]);

  const executeSwitchMode = async (targetMode: 'local' | 'databricks') => {
    setIsSwitchingMode(true);
    try {
      const res = await consoleApi.setStorageMode(targetMode);
      setStatus(res.console_status);
      if (targetMode === 'databricks') {
        const ins = res.inserted ?? res.flush?.inserted ?? 0;
        const fail = res.failed ?? res.flush?.failed ?? 0;
        const pend = res.pending_remaining ?? res.flush?.pending_remaining ?? res.console_status?.pending ?? 0;
        showNotification(
          fail > 0 ? 'error' : 'success',
          `Mode switched to CLOUD. Flush: ${ins} inserted, ${fail} failed, ${pend} pending`
        );
      } else {
        const pend = res.pending_remaining ?? res.console_status?.pending ?? 0;
        showNotification(
          'success',
          `Mode switched to LOCAL. Spool retained (${pend} pending).`
        );
      }
      await Promise.all([fetchStatus(true), fetchDevices(true), fetchLogs()]);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to switch storage mode');
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleRequestSwitchMode = (targetMode: 'local' | 'databricks') => {
    if (status?.storage_mode === targetMode) return;

    // When switching Local -> Cloud with pending > 0, confirm with the operator
    const pendingCount = status?.pending ?? status?.spool?.pending ?? 0;
    if (targetMode === 'databricks' && pendingCount > 0) {
      setShowConfirmCloudModal(true);
      return;
    }

    executeSwitchMode(targetMode);
  };

  const handleConfirmSwitchCloud = async () => {
    setShowConfirmCloudModal(false);
    await executeSwitchMode('databricks');
  };

  const handleTriggerFlush = async () => {
    setIsFlushing(true);
    try {
      const res = await consoleApi.triggerFlush();
      setLastFlushResult(res);
      const ins = res.inserted ?? res.flushed ?? 0;
      const fail = res.failed ?? 0;
      const pend = res.pending_remaining ?? res.pending ?? 0;
      showNotification(
        fail > 0 ? 'error' : 'success',
        `Flush complete: ${ins} inserted, ${fail} failed, ${pend} pending`
      );
      await Promise.all([fetchStatus(true), fetchDevices(true), fetchLogs(true)]);
      return res;
    } catch (err: any) {
      showNotification('error', err.message || 'Flush cycle failed');
    } finally {
      setIsFlushing(false);
    }
  };

  const pendingSpool = status?.pending ?? status?.spool?.pending ?? 0;
  const isLocal = status?.storage_mode === 'local';
  const advertisedHost = status?.advertised_host || status?.host || '127.0.0.1';
  const advertisedPort = status?.listen_port || status?.port || 5000;
  const advertisedUrl = status?.advertised_url || `http://${advertisedHost}:${advertisedPort}`;
  const listenHost = status?.listen_host || status?.host || '0.0.0.0';
  const listenPort = status?.listen_port || status?.port || 5000;

  const handleCopyAdvertisedUrl = () => {
    navigator.clipboard.writeText(advertisedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#0b1021]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-4">
            <BrandLogo size="md" subtitle="Operations Control Plane" />
            <div className="hidden lg:block border-l border-slate-800 pl-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="text-slate-400">Ingest:</span>
                <span className="text-sky-300 font-semibold">{advertisedUrl}</span>
                <button
                  onClick={handleCopyAdvertisedUrl}
                  className="p-0.5 text-slate-400 hover:text-white transition-colors"
                  title="Copy Ingest URL"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-500">Bind: {listenHost}:{listenPort}</span>
              </div>
            </div>
          </div>

          {/* Status Badges & Segmented Mode Toggle */}
          <div className="flex items-center gap-3">
            {/* Server Online Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </div>

            {/* Live Auto-Refresh & Last Updated Indicator */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
              {isTabVisible ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-semibold">Live</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-amber-400 font-semibold">Paused</span>
                </>
              )}
              <span className="text-slate-600">&bull;</span>
              <span className="text-[11px] text-slate-400" title={lastUpdated ? lastUpdated.toISOString() : undefined}>
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}
              </span>
            </div>

            {/* Segmented Storage Mode Control */}
            <div className="inline-flex p-0.5 bg-slate-900 border border-slate-700/80 rounded-lg">
              <button
                onClick={() => handleRequestSwitchMode('local')}
                disabled={isSwitchingMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  isLocal
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Local Mode: retain records in SQLite without auto-flushing to cloud"
              >
                <HardDrive className="w-3 h-3" />
                <span>Local</span>
              </button>
              <button
                onClick={() => handleRequestSwitchMode('databricks')}
                disabled={isSwitchingMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  !isLocal
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cloud Mode: stream spooled records to Databricks Lakehouse"
              >
                <Database className="w-3 h-3" />
                <span>Cloud</span>
              </button>
            </div>

            {/* Refresh All Button */}
            <button
              onClick={handleRefreshAll}
              disabled={isLoadingStatus || isLoadingDevices}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              title="Manual Refresh"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingStatus || isLoadingDevices ? 'animate-spin text-sky-400' : ''}`} />
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
              onSwitchMode={handleRequestSwitchMode}
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
              status={status}
              logs={logs}
              isLoading={isLoadingLogs}
              onRefresh={fetchLogs}
              autoRefresh={liveStreamLogs}
              onToggleAutoRefresh={() => setLiveStreamLogs(!liveStreamLogs)}
            />
          )}
        </div>
      </main>

      {/* Confirmation Modal: Switching Local -> Cloud with Pending Records */}
      {showConfirmCloudModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-sky-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Switch to Cloud (Databricks) Mode
                </h3>
                <p className="text-xs text-slate-400">
                  Enable automated cloud streaming for pending telemetry
                </p>
              </div>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200/90 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pendingSpool} pending records in local SQLite spool</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Switching to Cloud mode will activate background flushing. Spool batches will be transmitted into Databricks SQL landing tables.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>App-Level Durability Guarantee:</span>
              </div>
              <p className="leading-relaxed">
                Records are deleted from local disk <strong>only after</strong> all constituent table inserts for that payload succeed. If an insert fails, data remains safely buffered locally for retry.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmCloudModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitchCloud}
                disabled={isSwitchingMode}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2"
              >
                {isSwitchingMode ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Switch to Cloud</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
