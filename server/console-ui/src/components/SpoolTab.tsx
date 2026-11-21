import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  Download,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { ConsoleStatusResponse, FlushResponse } from '../types';
import { consoleApi } from '../api';

interface SpoolTabProps {
  status: ConsoleStatusResponse | null;
  onTriggerFlush: () => Promise<FlushResponse | void>;
  isFlushing: boolean;
  lastFlushResult: FlushResponse | null;
  onRefresh: () => void;
}

export const SpoolTab: React.FC<SpoolTabProps> = ({
  status,
  onTriggerFlush,
  isFlushing,
  lastFlushResult,
  onRefresh,
}) => {
  const [localFeedback, setLocalFeedback] = useState<FlushResponse | null>(null);

  const pending = status?.pending ?? status?.spool?.pending ?? 0;
  const maxRecords = status?.spool?.max_records || 10000;
  const flushBatch = status?.spool?.flush_max_records || 20;
  const flushInterval = status?.spool?.flush_interval_seconds || 5.0;
  const storageMode = status?.storage_mode || 'databricks';
  const isLocal = storageMode === 'local';
  const databricksConfigured = status?.databricks_configured ?? false;
  const lastFlush = status?.last_flush;

  const capacityPct = Math.min(100, Math.round((pending / maxRecords) * 100));

  const handleFlushClick = async () => {
    try {
      const res = await onTriggerFlush();
      if (res) {
        setLocalFeedback(res);
      }
    } catch {
      // handled in parent
    }
  };

  const activeFeedback = localFeedback || lastFlushResult;

  return (
    <div className="space-y-6">
      {/* 1. Large Hero Metric: Spool Queue Depth & Export/Flush Controls */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Durable Spool Queue Depth
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isLocal
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                  : 'bg-sky-950/40 text-sky-300 border-sky-800/40'
              }`}>
                {isLocal ? 'Local Storage (Cloud Flush Paused)' : 'Cloud Streaming Active'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-100 tracking-tight">
                {pending.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400">
                pending records / {maxRecords.toLocaleString()} max buffer
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
              Inbound payloads are durably saved to disk-backed SQLite before returning HTTP 200. Records survive power cuts, restarts, and network degradation.
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Export Snapshot JSONL */}
            <button
              onClick={() => consoleApi.downloadSpoolExport('jsonl')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-sm"
              title="Download snapshot of all buffered records as newline-delimited JSON"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export Snapshot (JSONL)</span>
            </button>

            {/* Export Snapshot SQLite */}
            <button
              onClick={() => consoleApi.downloadSpoolExport('sqlite')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all shadow-sm"
              title="Download SQLite database snapshot"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>.db</span>
            </button>

            {/* Flush to Cloud Button */}
            <button
              onClick={handleFlushClick}
              disabled={isFlushing || (!databricksConfigured && !isLocal)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-lg ${
                isLocal
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
              } disabled:opacity-50`}
              title={
                isLocal
                  ? 'Local mode active: click to test flush cycle (spool records retained)'
                  : !databricksConfigured
                  ? 'Databricks credentials not configured in server environment'
                  : 'Trigger immediate flush cycle to Databricks SQL'
              }
            >
              {isFlushing ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isFlushing ? 'Flushing Spool...' : isLocal ? 'Flush (Local Test)' : 'Flush to Cloud'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh queue status"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning Banners if in Local mode or Databricks unconfigured */}
        {isLocal && (
          <div className="mt-4 p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Local Mode Active:</strong> Cloud background flushing is paused. Telemetry is saved to local SQLite spool only. Switch to Cloud mode or click Flush to test.
            </span>
          </div>
        )}

        {!isLocal && !databricksConfigured && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              <strong>Databricks Not Configured:</strong> Cloud flush requires DATABRICKS_HOST and DATABRICKS_TOKEN in server/.env. Telemetry will remain safely in spool queue.
            </span>
          </div>
        )}

        {/* Flush Result Alert Banner */}
        {activeFeedback && (
          <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition-all ${
            activeFeedback.status === 'ok' || activeFeedback.status === 'success'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">
                Flush Cycle Result: {activeFeedback.message}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-1 font-mono text-[11px] text-slate-400">
                <span>Storage Mode: <strong className="text-slate-200 capitalize">{activeFeedback.storage_mode}</strong></span>
                <span>Flushed: <strong className="text-emerald-400">{activeFeedback.flushed ?? 0}</strong></span>
                <span>Failed: <strong className="text-rose-400">{activeFeedback.failed ?? 0}</strong></span>
                <span>Queue Pending: <strong className="text-slate-200">{activeFeedback.pending ?? 0}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Capacity Bar & Metrics Grid */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              Spool Buffer Capacity
            </span>
            <span className="font-mono text-slate-400">
              <strong className="text-indigo-400">{pending.toLocaleString()}</strong> / {maxRecords.toLocaleString()} records ({capacityPct}%)
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                capacityPct > 85 ? 'bg-rose-500' : capacityPct > 50 ? 'bg-amber-400' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.max(1, capacityPct)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[11px] text-slate-500 block">Pending In Queue</span>
              <span className="font-mono text-base font-bold text-slate-100">{pending}</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[11px] text-slate-500 block">Batch Limit</span>
              <span className="font-mono text-base font-bold text-slate-100">{flushBatch} records</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[11px] text-slate-500 block">Flush Interval</span>
              <span className="font-mono text-base font-bold text-slate-100">{flushInterval}s</span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[11px] text-slate-500 block">Storage Target</span>
              <span className={`font-mono text-base font-bold capitalize ${
                storageMode === 'local' ? 'text-amber-400' : 'text-sky-400'
              }`}>
                {storageMode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Last Flush & Architectural Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last Flush Details */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Last Background Flush Outcome
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Timestamp:</span>
              <span className="font-mono text-slate-200">{lastFlush?.time || 'No flush executed yet'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Status:</span>
              <span className="font-mono">
                {lastFlush?.success === true ? (
                  <span className="text-emerald-400 font-semibold">Success</span>
                ) : lastFlush?.success === false ? (
                  <span className="text-rose-400 font-semibold">Failed</span>
                ) : (
                  <span className="text-slate-500">Idle</span>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Records Inserted:</span>
              <span className="font-mono text-emerald-400 font-semibold">{lastFlush?.inserted ?? 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Records Failed:</span>
              <span className="font-mono text-rose-400 font-semibold">{lastFlush?.failed ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Transactional Architecture Callout */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Fault-Tolerant Ingest Guarantees
            </h3>
          </div>

          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Sub-10ms Ingest:</strong> HTTP POST immediately commits to SQLite before responding HTTP 200 to clients.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Atomic Transactions:</strong> Ingest into Databricks multi-table landing uses all-or-nothing transactions.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Data Loss:</strong> Spool records are pruned only upon successful database commit.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Full Local Portability:</strong> Use Export Snapshot (JSONL / SQLite) at any time to inspect or backup data without cloud.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
