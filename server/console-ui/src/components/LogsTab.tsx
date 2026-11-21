import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  RotateCw,
  ArrowDown,
} from 'lucide-react';
import { LogEntry } from '../types';

interface LogsTabProps {
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  isLoading,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== 'ALL' && log.level !== levelFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.logger.toLowerCase().includes(q) ||
        log.timestamp.toLowerCase().includes(q)
      );
    });
  }, [logs, search, levelFilter]);

  // Auto-scroll to bottom on new logs if enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'INFO':
        return 'text-sky-400 bg-sky-950/40 border-sky-800/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Log Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search log output..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Level Filter Pills */}
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

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              autoScroll
                ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-scroll</span>
          </button>

          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              autoRefresh
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Live Stream</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="bg-[#050811] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#080c14] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-300">server_ring_buffer.log</span>
            <span className="text-[11px] text-slate-500">
              ({filteredLogs.length} matching / {logs.length} in buffer)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
          </div>
        </div>

        <div
          ref={scrollRef}
          className="h-[520px] overflow-y-auto p-4 space-y-1 font-mono text-xs leading-relaxed"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-600 font-sans">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No log records match current filter.</p>
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className="hover:bg-slate-900/60 px-2 py-0.5 rounded transition-colors flex items-start gap-2.5"
              >
                {/* Timestamp */}
                <span className="text-slate-500 select-none shrink-0 text-[11px]">
                  {log.timestamp ? log.timestamp.slice(11, 23) : ''}
                </span>

                {/* Level Badge */}
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>

                {/* Logger */}
                <span className="text-slate-500 shrink-0 text-[11px] truncate max-w-[130px]">
                  [{log.logger}]
                </span>

                {/* Message */}
                <span className={`break-all ${
                  log.level === 'ERROR' || log.level === 'CRITICAL'
                    ? 'text-rose-300 font-semibold'
                    : log.level === 'WARNING'
                    ? 'text-amber-200'
                    : 'text-slate-200'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
