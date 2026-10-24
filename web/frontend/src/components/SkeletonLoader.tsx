import React from 'react';

export const KPISkeleton: React.FC = () => {
  return (
    <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3.5 bg-slate-800 rounded w-20" />
        <div className="h-6 w-6 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-800 rounded w-28 mb-3" />
      <div className="h-3 bg-slate-800 rounded w-36" />
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 bg-slate-800 rounded w-32 mb-1" />
          <div className="h-3 bg-slate-800 rounded w-20" />
        </div>
        <div className="h-6 w-16 bg-slate-800 rounded" />
      </div>
      <div className="h-64 bg-slate-900/50 rounded-lg flex items-end justify-between gap-2 p-4">
        {[40, 65, 30, 80, 55, 90, 45, 70, 60, 85].map((h, i) => (
          <div
            key={i}
            className="w-full bg-slate-800/40 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
};
