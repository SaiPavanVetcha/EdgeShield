import React from 'react';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  Clock,
  ArrowRight,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ConsoleStatusResponse } from '../types';

interface OverviewTabProps {
  status: ConsoleStatusResponse | null;
  onSwitchMode: (mode: 'local' | 'databricks') => void;
  isSwitchingMode: boolean;
  onTriggerFlush: () => void;
  isFlushing: boolean;
  onNavigateTab: (tab: 'overview' | 'devices' | 'spool' | 'logs') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  status,
  onSwitchMode,
  isSwitchingMode,
  onTriggerFlush,
  isFlushing,
  onNavigateTab,
}) => {
  if (!status) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RotateCw className="w-6 h-6 animate-spin text-sky-400 mr-3" />
        <span>Loading server status telemetry...</span>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const isLocal = status.storage_mode === 'local';
  const pending = status.pending ?? status.spool?.pending ?? 0;
  const maxSpool = status.spool?.max_records || 10000;
  const spoolPercent = Math.min(100, Math.round((pending / maxSpool) * 100));

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Server State & Uptime */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Primary Ingest Host
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100" title={status.advertised_url}>
              {status.advertised_host || status.host}:{status.listen_port || status.port}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
          <div className="mt-1 text-xs text-sky-400 font-mono truncate">
            {status.advertised_url || `http://${status.host}:${status.port}`}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Uptime: <strong className="text-slate-300 font-mono">{formatUptime(status.uptime_seconds)}</strong></span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Bind: {status.listen_host || status.host}:{status.listen_port || status.port}
            </span>
          </div>
        </div>

        {/* Card 2: Active Storage Mode */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Runtime Storage Mode
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLocal
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
            }`}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold capitalize ${isLocal ? 'text-amber-400' : 'text-sky-400'}`}>
              {status.storage_mode}
            </span>
            <span className="text-xs text-slate-400">
              {isLocal ? '(Local Spool Only)' : '(Databricks Lakehouse)'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {isLocal
              ? 'Zero-cloud testing. Records buffer durably in SQLite.'
              : 'Streaming flush worker active to Databricks SQL.'}
          </div>
        </div>

        {/* Card 3: Spool Queue Status */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Durable Spool Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {pending}
            </span>
            <span className="text-xs text-slate-400">
              pending / {maxSpool.toLocaleString()} limit
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                spoolPercent > 80 ? 'bg-rose-500' : spoolPercent > 40 ? 'bg-amber-400' : 'bg-indigo-400'
              }`}
              style={{ width: `${Math.max(2, spoolPercent)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Registered Devices */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Connected Edge Devices
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {status.devices?.online ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              online / <strong className="text-slate-200">{status.devices?.total ?? 0}</strong> total registered
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('devices')}
            className="mt-2 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <span>Inspect devices table</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 5: Last Cloud Flush */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Last Flush Attempt
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {status.last_flush?.success === true ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Success
              </span>
            ) : status.last_flush?.success === false ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                Error
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Idle / Awaiting Data
              </span>
            )}
            <span className="text-xs font-mono text-slate-300">
              {status.last_flush?.time ? status.last_flush.time.slice(11, 19) : 'None yet'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Inserted: <strong className="text-slate-200 font-mono">{status.last_flush?.inserted ?? 0}</strong> records
            {status.last_flush?.failed ? `, Failed: ${status.last_flush.failed}` : ''}
          </div>
        </div>

        {/* Card 6: Databricks Credentials Configured */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Databricks Credentials
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {status.databricks_configured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configured (.env)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                Not Configured
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {status.databricks_configured
              ? 'Host, HTTP path, and SQL warehouse token detected.'
              : 'Set DATABRICKS_HOST/TOKEN to enable lakehouse flush.'}
          </div>
        </div>
      </div>

      {/* 2. Interactive Storage Mode Control Box */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Storage Mode Control Plane</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Switching storage mode changes how inbound telemetry is processed. Spool files are durable and are never wiped when toggling modes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex p-1 bg-slate-900 border border-slate-700/80 rounded-xl">
              <button
                onClick={() => onSwitchMode('local')}
                disabled={isSwitchingMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isLocal
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Local Spool</span>
              </button>
              <button
                onClick={() => onSwitchMode('databricks')}
                disabled={isSwitchingMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  !isLocal
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Cloud (Databricks)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          <div className={`p-4 rounded-xl border transition-colors ${
            isLocal ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-950/40 border-slate-800/80'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${isLocal ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Local Mode (Active when selected)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inbound telemetry is committed to local SQLite (<code className="text-amber-300">spool/server_spool.db</code>) and registered in memory. Background cloud flush is paused. Ideal for zero-cloud setup, lab demos, and offline testing.
            </p>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${
            !isLocal ? 'bg-sky-950/20 border-sky-500/30' : 'bg-slate-950/40 border-slate-800/80'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${!isLocal ? 'bg-sky-400' : 'bg-slate-600'}`} />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Databricks Lakehouse Mode
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Background flush worker transmits spooled batches into Databricks SQL landing tables (<code className="text-sky-300">edgeshield_db</code>) using atomic transactions. Spool records are safely pruned only after successful commit.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions & Operations Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onTriggerFlush}
          disabled={isFlushing}
          className="bg-[#0f172a] hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors flex items-center justify-between group disabled:opacity-50"
        >
          <div>
            <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-sky-400" />
              <span>Trigger Manual Flush</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Immediately flush pending queue to target storage
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={() => onNavigateTab('logs')}
          className="bg-[#0f172a] hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>Server Ring Buffer Logs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Stream live terminal log entries and flush events
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>

        <a
          href="/health"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0f172a] hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Health Endpoint JSON</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Inspect raw JSON health check at /health
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        </a>
      </div>
    </div>
  );
};
