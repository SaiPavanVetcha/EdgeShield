import React from 'react';

export const KPISkeleton: React.FC = () => {
  return (
    <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 sm:p-6 animate-pulse min-h-[132px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3.5 bg-slate-800 rounded w-16" />
          <div className="h-7 w-7 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-7 bg-slate-800 rounded w-24 mb-2" />
      </div>
      <div className="h-3 bg-slate-800/80 rounded w-28 mt-2" />
    </div>
  );
};

export const ChartSkeleton: React.FC<{ isHero?: boolean }> = ({ isHero = false }) => {
  return (
    <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 bg-slate-800 rounded w-32 mb-1.5" />
          <div className="h-3 bg-slate-800 rounded w-48" />
        </div>
        <div className="h-6 w-20 bg-slate-800 rounded-full" />
      </div>
      <div className={`${isHero ? 'h-80 sm:h-96' : 'h-64'} bg-slate-900/50 rounded-lg flex items-end justify-between gap-2 p-4`}>
        {[40, 65, 30, 80, 55, 90, 45, 70, 60, 85, 50, 75, 65, 90].slice(0, isHero ? 14 : 10).map((h, i) => (
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
