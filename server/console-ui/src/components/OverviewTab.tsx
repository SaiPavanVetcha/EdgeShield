import React, { useState } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  ArrowRight,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Zap,
  Copy,
  Check,
  Activity,
  Radio,
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
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!status) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
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
  const maxSpool = status.spool?.max_records ?? 100000;
  const spoolPercent = maxSpool > 0 ? Math.min(100, Math.round((pending / maxSpool) * 100)) : 0;
  const advertisedHost = status.advertised_host || status.host || '127.0.0.1';
  const advertisedPort = status.listen_port || status.port || 5000;
  const advertisedUrl = status.advertised_url || `http://${advertisedHost}:${advertisedPort}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(advertisedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. PRIMARY METRIC CARDS: Received | Waiting | Inserted */}
      <section aria-label="Pipeline KPIs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Telemetry Pipeline Flow
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Ingest &rarr; Spool &rarr; Cloud
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: RECEIVED (Ingest) */}
          <div className="bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Received</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full font-mono">
                Ingest
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
                {(status.records_received ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">payloads</span>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Total inbound edge telemetry payloads ingested over HTTP since server process startup.
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Status: <strong className="text-emerald-400">Accepting HTTP POST</strong></span>
              <span>Endpoint: <strong className="text-slate-300">/metrics</strong></span>
            </div>
          </div>

          {/* Card 2: WAITING (Spool Queue Depth) */}
          <div className="bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Waiting</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full font-mono ${
                pending > 0
                  ? 'text-amber-400 bg-amber-950/60 border-amber-800/50'
                  : 'text-slate-400 bg-slate-900 border-slate-800'
              }`}>
                {pending > 0 ? `${pending} Queued` : 'Drained'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
                {pending.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">
                / {maxSpool > 0 ? `${maxSpool.toLocaleString()} limit` : 'unlimited'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Records buffered in local durable SQLite spool awaiting flush to target destination.
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 mb-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    spoolPercent > 80 ? 'bg-rose-500' : spoolPercent > 40 ? 'bg-amber-400' : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.max(2, spoolPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Spool utilization: <strong className="text-slate-300">{spoolPercent}%</strong></span>
                <button
                  onClick={() => onNavigateTab('spool')}
                  className="text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Manage spool &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: INSERTED (Cloud Committed) */}
          <div className="bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Inserted</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full font-mono ${
                isLocal
                  ? 'text-amber-400 bg-amber-950/60 border-amber-800/50'
                  : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
              }`}>
                {isLocal ? 'Local Mode' : 'Cloud Active'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
                {(status.records_inserted_to_cloud ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">to cloud</span>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Telemetry records committed to Databricks Lakehouse landing tables (<code className="text-sky-300 text-[11px]">edgeshield_db</code>).
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Last flush: <strong className={status.last_flush?.success ? 'text-emerald-400' : status.last_flush?.success === false ? 'text-rose-400' : 'text-slate-300'}>
                {status.last_flush?.success === true ? 'Success' : status.last_flush?.success === false ? 'Error' : 'Awaiting data'}
              </strong></span>
              <span>Time: <strong className="text-slate-300">{status.last_flush?.time ? status.last_flush.time.slice(11, 19) : 'None'}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECONDARY CONTROLS & ENDPOINTS: Host Card | Storage Mode Toggle | Devices Fleet */}
      <section aria-label="Operations & Endpoints" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Host & Advertised Endpoint Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>Advertised Ingest Host</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-sky-300 font-bold truncate select-all" title={advertisedUrl}>
                {advertisedUrl}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
                title="Copy Advertised Ingest URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Advertised IPv4:</span>
                <strong className="text-slate-200 font-mono">{advertisedHost}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Bind Socket:</span>
                <span className="text-slate-400 font-mono">{status.listen_host || status.host}:{status.listen_port || status.port}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Server Uptime:</span>
                <strong className="text-slate-200 font-mono">{formatUptime(status.uptime_seconds)}</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Edge client target</span>
            <a
              href="/health"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>/health</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Mode Switch & Flush Controls Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Storage Mode &amp; Flush</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full font-mono border ${
                isLocal
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                  : 'bg-sky-950/60 text-sky-300 border-sky-800/50'
              }`}>
                {status.storage_mode}
              </span>
            </div>

            {/* Segmented Mode Switch */}
            <div className="inline-flex w-full p-1 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                onClick={() => onSwitchMode('local')}
                disabled={isSwitchingMode}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isLocal
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Local Mode: retain records in SQLite without auto-flushing to cloud"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Local Spool</span>
              </button>
              <button
                onClick={() => onSwitchMode('databricks')}
                disabled={isSwitchingMode}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  !isLocal
                    ? 'bg-sky-500 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cloud Mode: stream spooled records into Databricks Lakehouse"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Cloud (Databricks)</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {isLocal
                ? 'Local mode active: telemetry is durably saved in SQLite spool without cloud upload.'
                : 'Cloud streaming active: background worker drains spooled records to Databricks SQL.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              onClick={onTriggerFlush}
              disabled={isFlushing}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all shadow-md ${
                isLocal
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
              } disabled:opacity-50`}
            >
              {isFlushing ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isFlushing ? 'Flushing...' : isLocal ? 'Flush (Local Test)' : 'Flush to Cloud Now'}</span>
            </button>
          </div>
        </div>

        {/* Connected Edge Devices Fleet Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Connected Edge Fleet</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full font-mono">
                Auto-Discovery
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                {status.devices?.online ?? 0}
              </span>
              <span className="text-xs text-slate-400">
                online / <strong className="text-slate-200 font-mono">{status.devices?.total ?? 0}</strong> total registered
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              PC client agents and ESP32 environmental nodes reporting real-time telemetry into this ingestion node.
            </p>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Databricks Credentials:</span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono ${
                status.databricks_configured ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {status.databricks_configured ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {status.databricks_configured ? 'Configured' : 'Missing .env'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onNavigateTab('devices')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Inspect Devices Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. LAST CLOUD FLUSH DETAIL BANNER (If present) */}
      {status.last_flush && status.last_flush.time && (
        <section aria-label="Last Flush Summary">
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            status.last_flush.success
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : status.last_flush.success === false
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-3">
              {status.last_flush.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : status.last_flush.success === false ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Zap className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  <span>Last Cloud Flush Outcome:</span>
                  <span className="font-mono text-xs">
                    {status.last_flush.time}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {status.last_flush.error ? (
                    <span className="text-rose-400 font-mono">{status.last_flush.error}</span>
                  ) : (
                    <span>{status.last_flush.inserted ?? 0} inserted, {status.last_flush.failed ?? 0} failed &bull; Spool retained on disk if failed</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold shrink-0 flex items-center gap-1 self-end sm:self-auto"
            >
              <span>View Diagnostics</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
