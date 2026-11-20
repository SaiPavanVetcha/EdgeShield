import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BatteryCharging } from 'lucide-react';
import { TimeseriesPoint } from '../types';

interface MetricLineConfig {
  key: string;
  name: string;
  color: string;
  unit: string;
  secondary?: boolean;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: TimeseriesPoint[] | any[];
  lines: MetricLineConfig[];
  available: boolean;
  emptyMessage?: string;
  yDomain?: [number, number];
  isHero?: boolean;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  data,
  lines,
  available,
  emptyMessage,
  yDomain = [0, 100],
  isHero = false,
}) => {
  // Hide chart if metric is completely unavailable (e.g. desktop with no battery)
  if (!available) {
    return null;
  }

  // Ensure data is sorted ascending by timestamp before render (critical for 7d/All ranges)
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => {
      const timeA = new Date(
        typeof a.timestamp === 'string' && a.timestamp.includes('T')
          ? a.timestamp
          : String(a.timestamp).replace(' ', 'T')
      ).getTime();
      const timeB = new Date(
        typeof b.timestamp === 'string' && b.timestamp.includes('T')
          ? b.timestamp
          : String(b.timestamp).replace(' ', 'T')
      ).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeA - timeB;
      }
      return String(a.timestamp).localeCompare(String(b.timestamp));
    });
  }, [data]);

  // When there are zero points but metric exists, reserve chart space with empty state if emptyMessage is provided
  if (sortedData.length === 0) {
    if (!emptyMessage) {
      return null;
    }
    return (
      <div
        className={`bg-[#0f172a]/95 border ${
          isHero ? 'border-slate-800/90 shadow-lg' : 'border-slate-800/80 shadow-md'
        } rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-slate-700/80`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`${
                  isHero ? 'text-base sm:text-lg font-bold' : 'text-sm font-semibold'
                } text-slate-100 tracking-tight`}
              >
                {title}
              </h3>
              {isHero && (
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Primary
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {lines.map((l) => (
              <div key={l.key} className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full opacity-50" style={{ backgroundColor: l.color }} />
                <span>{l.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${
            isHero ? 'h-80 sm:h-96' : 'h-64'
          } w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800/80 bg-slate-950/40 text-center p-6`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2.5">
            <BatteryCharging className="w-5 h-5 text-purple-400/70" />
          </div>
          <p className="text-xs font-medium text-slate-300">{emptyMessage}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Try adjusting the time range preset or selecting a different device window
          </p>
        </div>
      </div>
    );
  }

  // Detect if timeseries spans more than 24 hours to include date in X-axis
  const isMultiDay =
    sortedData.length > 1 &&
    (() => {
      try {
        const first = new Date(String(sortedData[0].timestamp).replace(' ', 'T')).getTime();
        const last = new Date(String(sortedData[sortedData.length - 1].timestamp).replace(' ', 'T')).getTime();
        return Math.abs(last - first) > 24 * 3600 * 1000;
      } catch {
        return false;
      }
    })();

  // Format timestamp for X-Axis tick (HH:mm or MMM d, HH:mm on wide ranges)
  const formatXAxis = (tickItem: string) => {
    try {
      const d = new Date(String(tickItem).replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(tickItem).slice(11, 16);
      if (isMultiDay) {
        return (
          d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
          ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        );
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return tickItem;
    }
  };

  // Custom Minimal Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let formattedDate = label;
      try {
        const d = new Date(label.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
        }
      } catch {
        // fallback
      }

      return (
        <div className="bg-[#0b1021] border border-slate-800 rounded-lg p-2.5 shadow-xl text-xs">
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 pb-1 border-b border-slate-800/80">
            {formattedDate}
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                </div>
                <span className="font-mono font-semibold text-slate-100">
                  {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-[#0f172a]/95 border ${
        isHero ? 'border-slate-800/90 shadow-lg' : 'border-slate-800/80 shadow-md'
      } rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-slate-700/80`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`${
                isHero ? 'text-base sm:text-lg font-bold' : 'text-sm font-semibold'
              } text-slate-100 tracking-tight`}
            >
              {title}
            </h3>
            {isHero && (
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Primary
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Minimal inline legend */}
        <div className="flex items-center gap-3">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span>{l.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${isHero ? 'h-80 sm:h-96' : 'h-64'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              minTickGap={isHero ? 45 : 30}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {lines.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeWidth={isHero ? 2.5 : 2}
                dot={false}
                activeDot={{ r: isHero ? 5 : 4, stroke: '#090d16', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
