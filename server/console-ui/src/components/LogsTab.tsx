import React, { useState, useMemo } from 'react';
import {
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Radio,
  HardDrive,
  Database,
  ChevronDown,
  ChevronUp,
  Search,
  Terminal,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { ConsoleStatusResponse, LogEntry } from '../types';

interface LogsTabProps {
  status: ConsoleStatusResponse | null;
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  status,
  logs,
  isLoading,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}) => {
  const [showRawTerminal, setShowRawTerminal] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  // Extract recent errors and warnings
  const errorOrWarningLogs = useMemo(() => {
    return logs
      .filter((l) => l.level === 'ERROR' || l.level === 'CRITICAL' || l.level === 'WARNING')
      .slice(-15)
      .reverse();
  }, [logs]);

  // Find the last explicit error string if any
  const lastErrorString = useMemo(() => {
    if (status?.last_flush?.error) {
      return status.last_flush.error;
    }
    const lastErrLog = logs.slice().reverse().find((l) => l.level === 'ERROR' || l.level === 'CRITICAL');
    return lastErrLog ? lastErrLog.message : null;
  }, [status, logs]);

  // Filtered raw logs for the optional collapsed terminal view
  const filteredRawLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.logger.toLowerCase().includes(q) ||
        log.timestamp.toLowerCase().includes(q)
      );
    });
  }, [logs, search, levelFilter]);

  const received = status?.records_received ?? 0;
  const waiting = status?.pending ?? status?.spool?.pending ?? 0;
  const inserted = status?.records_inserted_to_cloud ?? 0;
  const lastFlush = status?.last_flush;

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Diagnostics &amp; System Health</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline diagnostics, last flush outcome, and error tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onToggleAutoRefresh}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              autoRefresh
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle live log polling"
          >
            {autoRefresh ? 'Live Auto-Poll (4s)' : 'Auto-Poll Paused'}
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors disabled:opacity-50"
            title="Manual refresh diagnostics"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Primary KPI Cards: Received | Waiting | Inserted */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Received */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Received</span>
            </span>
            <span className="text-[10px] text-sky-400 font-mono">Inbound</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100">
              {received.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">payloads</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>HTTP 200 Ingestion</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </div>

        {/* Card: Waiting */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Waiting</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">Spool Buffer</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100">
              {waiting.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">in queue</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Durable SQLite</span>
            <span className={waiting > 0 ? 'text-amber-400' : 'text-slate-400'}>
              {waiting > 0 ? 'Pending Drain' : 'Clear'}
            </span>
          </div>
        </div>

        {/* Card: Inserted */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Inserted</span>
            </span>
            <span className="text-[10px] text-blue-400 font-mono">Lakehouse</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100">
              {inserted.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">committed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Databricks SQL</span>
            <span className={status?.storage_mode === 'local' ? 'text-amber-400' : 'text-emerald-400'}>
              {status?.storage_mode === 'local' ? 'Local Mode' : 'Streaming'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Diagnostic Cards: Last Flush Result & System Health / Last Error */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card A: Last Flush Result */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Last Cloud Flush Result</span>
              </span>
              {lastFlush?.success === true ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Success
                </span>
              ) : lastFlush?.success === false ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full font-mono">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
                  Idle / No Run
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-center font-mono text-xs">
              <div>
                <div className="text-slate-500 text-[10px] uppercase">Inserted</div>
                <div className="text-emerald-400 font-bold text-base mt-0.5">{lastFlush?.inserted ?? 0}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase">Failed</div>
                <div className={`font-bold text-base mt-0.5 ${(lastFlush?.failed ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {lastFlush?.failed ?? 0}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase">Remaining</div>
                <div className="text-slate-200 font-bold text-base mt-0.5">{lastFlush?.pending ?? waiting}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Timestamp: </span>
              <span className="font-mono">{lastFlush?.time ? lastFlush.time : 'None recorded yet'}</span>
            </div>
            {lastFlush?.error && (
              <div className="mt-2 text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg font-mono leading-relaxed">
                {lastFlush.error}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Mode: <strong className="text-slate-300 capitalize">{status?.storage_mode}</strong></span>
            <span>Interval: <strong className="text-slate-300">{status?.spool?.flush_interval_seconds || 5}s</strong></span>
          </div>
        </div>

        {/* Card B: System Health & Last Error */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>System Health &amp; Error State</span>
              </span>
              {lastErrorString ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  Issue Logged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Clean
                </span>
              )}
            </div>

            {lastErrorString ? (
              <div className="space-y-2">
                <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Latest Error Encountered:</span>
                </div>
                <div className="p-3 bg-slate-950 border border-rose-900/40 rounded-lg text-xs font-mono text-rose-300 break-words leading-relaxed max-h-32 overflow-y-auto">
                  {lastErrorString}
                </div>
                <p className="text-[11px] text-slate-400">
                  Data in SQLite durable spool remains safely preserved until resolved.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>All Ingestion Systems Operational</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Zero runtime transmission errors or schema failures reported. Client metrics and local SQLite spool operations are performing smoothly.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Buffer Size: <strong className="text-slate-300">{logs.length} entries</strong></span>
            <span>Warnings/Errors: <strong className={errorOrWarningLogs.length > 0 ? 'text-amber-400' : 'text-slate-300'}>{errorOrWarningLogs.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 4. Recent Warnings & Errors Stream */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Recent Diagnostic Events &amp; Warnings
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {errorOrWarningLogs.length} events logged
          </span>
        </div>

        {errorOrWarningLogs.length === 0 ? (
          <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span className="font-semibold text-slate-300">Zero Warning or Error Events</span>
            <span className="text-[11px] text-slate-500 max-w-md">
              No transmission failures, socket drops, or database errors recorded in the server ring buffer.
            </span>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {errorOrWarningLogs.map((log, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  log.level === 'ERROR' || log.level === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    : 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.level === 'ERROR' || log.level === 'CRITICAL'
                        ? 'bg-rose-900/80 text-rose-200'
                        : 'bg-amber-900/80 text-amber-200'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-400 text-[11px]">[{log.logger}]</span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp.slice(11, 19)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Optional Collapsed Full Terminal Log Viewer */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowRawTerminal(!showRawTerminal)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Raw Server Log Stream
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              ({logs.length} ring buffer records)
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-sky-400">
            <span>{showRawTerminal ? 'Hide Terminal View' : 'Inspect Raw Logs'}</span>
            {showRawTerminal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showRawTerminal && (
          <div className="p-4 border-t border-slate-800 space-y-3 bg-[#080c14]">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter raw logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      levelFilter === lvl
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal output box */}
            <div className="bg-[#050810] border border-slate-800/80 rounded-lg p-3 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1">
              {filteredRawLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-6">No matching log records found</div>
              ) : (
                filteredRawLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-slate-900/60 px-1 rounded flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">{log.timestamp.slice(11, 19)}</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === 'ERROR' || log.level === 'CRITICAL'
                          ? 'text-rose-400'
                          : log.level === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-slate-400 shrink-0">[{log.logger}]</span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
