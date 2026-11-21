import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Monitor,
  Search,
  MapPin,
  Clock,
  RotateCw,
} from 'lucide-react';
import { RegisteredDevice } from '../types';

interface DevicesTabProps {
  devices?: RegisteredDevice[] | null;
  total?: number;
  online?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const DevicesTab: React.FC<DevicesTabProps> = ({
  devices = [],
  total = 0,
  online = 0,
  isLoading = false,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline'>('all');

  const safeDevices = useMemo(() => {
    return Array.isArray(devices) ? devices.filter(Boolean) : [];
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return safeDevices.filter((d) => {
      const isOnline = Boolean(d.is_online);
      if (filterMode === 'online' && !isOnline) return false;
      if (filterMode === 'offline' && isOnline) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const devId = String(d.device_id || '').toLowerCase();
      const host = String(d.hostname || '').toLowerCase();
      const room = String(d.room || '').toLowerCase();
      const ip = String(d.client_ip || '').toLowerCase();
      const plat = String(d.platform || '').toLowerCase();
      const typeStr = String(d.type || '').toLowerCase();
      return (
        devId.includes(q) ||
        host.includes(q) ||
        room.includes(q) ||
        ip.includes(q) ||
        plat.includes(q) ||
        typeStr.includes(q)
      );
    });
  }, [safeDevices, search, filterMode]);

  const formatLastSeen = (utcStr?: string | null, secsSince?: number | null) => {
    if (typeof secsSince === 'number' && !isNaN(secsSince) && secsSince >= 0) {
      if (secsSince < 5) return 'Just now';
      if (secsSince < 60) return `${Math.round(secsSince)}s ago`;
      if (secsSince < 3600) return `${Math.round(secsSince / 60)}m ago`;
      return `${Math.round(secsSince / 3600)}h ago`;
    }
    if (!utcStr || typeof utcStr !== 'string') return 'Never';
    return utcStr.replace('T', ' ').slice(0, 19);
  };

  const safeTotal = typeof total === 'number' ? total : safeDevices.length;
  const safeOnline = typeof online === 'number' ? online : safeDevices.filter(d => Boolean(d.is_online)).length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, host, room, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({safeTotal})
            </button>
            <button
              onClick={() => setFilterMode('online')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'online'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Online ({safeOnline})
            </button>
            <button
              onClick={() => setFilterMode('offline')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === 'offline'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Offline ({Math.max(0, safeTotal - safeOnline)})
            </button>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Devices Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1021] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Device ID & Hostname</th>
                <th className="py-3 px-4">Type / Platform</th>
                <th className="py-3 px-4">Physical Room</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Payloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    <Monitor className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No edge devices found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {search
                        ? 'No devices match your search filter.'
                        : 'Edge devices will appear automatically upon their first telemetry transmission to /metrics.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev, idx) => (
                  <tr
                    key={dev.device_id || `dev-${idx}`}
                    className="hover:bg-slate-850/50 transition-colors"
                  >
                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {dev.is_online ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* ID & Hostname */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{dev.hostname || dev.device_id || 'Unknown Device'}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {dev.device_id || '—'}
                      </div>
                    </td>

                    {/* Type & Platform */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 capitalize">
                        {dev.type ? String(dev.type).replace(/_/g, ' ') : 'PC Telemetry'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {dev.platform || '—'}
                      </div>
                    </td>

                    {/* Physical Room */}
                    <td className="py-3.5 px-4">
                      {dev.room && String(dev.room).trim() ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {String(dev.room).trim()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/80">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Client IP */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      {dev.client_ip && dev.client_ip !== 'unknown' ? dev.client_ip : '—'}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3.5 px-4 text-xs font-sans">
                      <div className="text-slate-200 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatLastSeen(dev.last_seen_utc, dev.seconds_since_seen)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {typeof dev.last_seen_utc === 'string' && dev.last_seen_utc
                          ? dev.last_seen_utc.replace('T', ' ').slice(0, 19)
                          : '—'}
                      </div>
                    </td>

                    {/* Payload Count (Defensive against undefined/null) */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                      {(dev.payload_count ?? 0).toLocaleString()}
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
