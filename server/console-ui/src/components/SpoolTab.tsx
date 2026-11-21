import React, { useState } from 'react';
import {
  HardDrive,
  Play,
  RotateCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ConsoleStatusResponse, FlushResponse } from '../types';

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
      {/* 1. Spool Header Card with Flush Action */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Transactional Durable Spool
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                SQLite disk-backed queue protecting inbound telemetry before cloud landing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh status"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleFlushClick}
              disabled={isFlushing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {isFlushing ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>{isFlushing ? 'Flushing Spool...' : 'Flush Now'}</span>
            </button>
          </div>
        </div>

        {/* Flush Result Alert Banner */}
        {activeFeedback && (
          <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 transition-all ${
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
              Spool Buffer Utilization
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
              <span className="text-[11px] text-slate-500 block">Pending Records</span>
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
          </ul>
        </div>
      </div>
    </div>
  );
};
