import React from 'react';
import { LucideIcon } from 'lucide-react';
import { MetricKPI } from '../types';

interface KPICardProps {
  title: string;
  kpi: MetricKPI;
  icon: LucideIcon;
  colorClass?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  kpi,
  icon: Icon,
  colorClass = 'text-sky-400',
}) => {
  // CRITICAL REQUIREMENT: Hide card if no telemetry exists for the selected device
  if (!kpi || !kpi.available || kpi.value === null || kpi.value === undefined) {
    return null;
  }

  const getStatusBorder = () => {
    if (kpi.status === 'critical') return 'border-rose-500/50 shadow-rose-950/20';
    if (kpi.status === 'warning') return 'border-amber-500/50 shadow-amber-950/20';
    return 'border-slate-800/80 hover:border-slate-700/80';
  };

  const getStatusBadge = () => {
    if (kpi.status === 'critical') {
      return (
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
          Critical
        </span>
      );
    }
    if (kpi.status === 'warning') {
      return (
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Warning
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-[#0f172a]/95 border rounded-xl p-4.5 transition-all shadow-md flex flex-col justify-between ${getStatusBorder()}`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {getStatusBadge()}
            <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            {kpi.value.toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{kpi.unit}</span>
        </div>
      </div>

      {kpi.subtext && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{kpi.subtext}</span>
        </div>
      )}
    </div>
  );
};
