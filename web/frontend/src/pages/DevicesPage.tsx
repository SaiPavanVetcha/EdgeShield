import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Cpu,
  Layers,
  HardDrive,
  Battery,
  Thermometer,
  MapPin,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useTelemetry } from '../hooks/useTelemetry';
import { DeviceStatus } from '../types';

export const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { devices, setSelectedDeviceId, selectedRoom, setSelectedRoom, distinctRooms } = useTelemetry();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.room && d.room.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.platform && d.platform.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesRoom = selectedRoom === 'all' || (d.room || '').trim() === selectedRoom.trim();

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [devices, searchQuery, statusFilter, selectedRoom]);

  const counts = useMemo(() => {
    return {
      total: devices.length,
      online: devices.filter((d) => d.status === 'online').length,
      warning: devices.filter((d) => d.status === 'warning').length,
      offline: devices.filter((d) => d.status === 'offline').length,
    };
  }, [devices]);

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Registered Edge Devices</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Inventory and health status synchronized from Databricks Gold dim_device
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Total Devices</span>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{counts.total}</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-400">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-400">Online</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{counts.online}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-400">Warning</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{counts.warning}</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Offline</span>
            <div className="text-2xl font-bold font-mono text-slate-300 mt-1">{counts.offline}</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 rounded-xl p-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search hostname, ID, room, platform..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Room Filter Pills */}
          {distinctRooms.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <span className="text-[10.5px] text-slate-400 font-medium px-2 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> Room:
              </span>
              <button
                onClick={() => setSelectedRoom('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedRoom === 'all'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {distinctRooms.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoom(r)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedRoom === r
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {(['all', 'online', 'warning', 'offline'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1021] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Device / Hostname</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Cores</th>
                <th className="py-3 px-4">Telemetry Feeds</th>
                <th className="py-3 px-4">Last Telemetry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No devices match the active filter or no rows in dim_device.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr
                    key={dev.device_id}
                    className="hover:bg-slate-850/40 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{dev.hostname}</div>
                      <div className="font-mono text-[10px] text-slate-400">{dev.device_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      {dev.room ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/60 font-mono text-[11px]">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          {dev.room}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {dev.platform || 'Linux / Unknown'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {dev.logical_cores ? `${dev.logical_cores} Cores` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {dev.capabilities.has_cpu && (
                          <span title="CPU Telemetry" className="p-1 rounded bg-slate-900 text-sky-400 border border-slate-800">
                            <Cpu className="w-3 h-3" />
                          </span>
                        )}
                        {dev.capabilities.has_ram && (
                          <span title="RAM Telemetry" className="p-1 rounded bg-slate-900 text-indigo-400 border border-slate-800">
                            <Layers className="w-3 h-3" />
                          </span>
                        )}
                        {dev.capabilities.has_disk && (
                          <span title="Disk Telemetry" className="p-1 rounded bg-slate-900 text-amber-400 border border-slate-800">
                            <HardDrive className="w-3 h-3" />
                          </span>
                        )}
                        {dev.capabilities.has_battery && (
                          <span title="Battery Telemetry" className="p-1 rounded bg-slate-900 text-purple-400 border border-slate-800">
                            <Battery className="w-3 h-3" />
                          </span>
                        )}
                        {dev.capabilities.has_environment && (
                          <span title="Environment Sensor" className="p-1 rounded bg-slate-900 text-rose-400 border border-slate-800">
                            <Thermometer className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {dev.last_seen ? dev.last_seen.replace('T', ' ').slice(0, 19) : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={dev.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSelectDevice(dev.device_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-sky-500 text-slate-300 hover:text-white border border-slate-800 hover:border-sky-500 text-xs font-medium transition-colors"
                      >
                        <span>Dashboard</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
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
