import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  BellRing,
  ShieldAlert,
  Clock,
  Check,
  Info,
} from 'lucide-react';
import { useTelemetry } from '../hooks/useTelemetry';
import { AlertItem } from '../types';

export const AlertsPage: React.FC = () => {
  const { alerts, handleAcknowledgeAlert, refreshAll } = useTelemetry();
  const [filterTab, setFilterTab] = useState<'active' | 'acknowledged' | 'all'>('active');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const alertList = alerts?.alerts || [];

  const filteredAlerts = useMemo(() => {
    return alertList.filter((a) => {
      if (filterTab === 'active') return !a.acknowledged;
      if (filterTab === 'acknowledged') return a.acknowledged;
      return true;
    });
  }, [alertList, filterTab]);

  const onAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await handleAcknowledgeAlert(alertId);
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Active Fleet Alerts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rule-based threshold violations evaluated in real-time across edge telemetry
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Total Alerts</span>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {alerts?.total_count || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <BellRing className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-rose-400">Critical</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              {alerts?.critical_count || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-400">Warning</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {alerts?.warning_count || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-400">Acknowledged</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {alertList.filter((a) => a.acknowledged).length}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Rules Information Banner */}
      <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-medium text-slate-200 mb-2">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Active Rules Engine (V1 Heuristics)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">CPU &gt; 85% sustained</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">RAM &gt; 90%</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">Disk &gt; 90%</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">Temp &gt; 35°C</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">Offline &gt; 3 min</span>
          <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">Battery &lt; 20%</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['active', 'acknowledged', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filterTab === tab
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab} Alerts ({tab === 'all' ? alertList.length : tab === 'active' ? alerts?.active_count || 0 : alertList.filter((a) => a.acknowledged).length})
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1021] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Rule & Message</th>
                <th className="py-3 px-4">Target Device</th>
                <th className="py-3 px-4">Current Value / Threshold</th>
                <th className="py-3 px-4">Trigger Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <span>No {filterTab} alerts reported by rules engine.</span>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      {alert.severity === 'critical' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          Critical
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Warning
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{alert.rule_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{alert.message}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{alert.hostname}</div>
                      <div className="font-mono text-[10px] text-slate-500">{alert.device_id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-200 font-semibold">{alert.current_value}</div>
                      <div className="text-slate-500 text-[10px]">Rule: {alert.threshold}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{alert.triggered_at ? alert.triggered_at.replace('T', ' ').slice(0, 19) : 'Now'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {alert.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          disabled={acknowledgingId === alert.id}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {acknowledgingId === alert.id ? 'Saving...' : 'Acknowledge'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Acked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
