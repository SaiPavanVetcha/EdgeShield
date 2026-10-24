import React, { useState } from 'react';
import {
  RotateCw,
  Calendar,
  ChevronDown,
  Monitor,
  Check,
  Clock,
  Database,
} from 'lucide-react';
import { Device, PresetTimeRange, TimeRangeState } from '../types';

interface TopBarProps {
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  timeRange: TimeRangeState;
  onChangePreset: (preset: PresetTimeRange) => void;
  onApplyCustomRange: (from: string, to: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isCached?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  timeRange,
  onChangePreset,
  onApplyCustomRange,
  onRefresh,
  isLoading,
  isCached,
}) => {
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);

  // Default custom inputs from current timeRange ISO string formatted as YYYY-MM-DDTHH:mm
  const formatForInput = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const [customFrom, setCustomFrom] = useState(formatForInput(timeRange.from));
  const [customTo, setCustomTo] = useState(formatForInput(timeRange.to));

  const presets: PresetTimeRange[] = ['1h', '6h', '24h', '7d'];

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFrom && customTo) {
      onApplyCustomRange(new Date(customFrom).toISOString(), new Date(customTo).toISOString());
      setCustomRangeOpen(false);
    }
  };

  return (
    <div className="bg-[#0b1021]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Device Selector */}
      <div className="relative">
        <button
          onClick={() => {
            setDeviceDropdownOpen(!deviceDropdownOpen);
            setCustomRangeOpen(false);
          }}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-sm font-medium text-slate-100 hover:border-slate-600 transition-colors"
        >
          <Monitor className="w-4 h-4 text-sky-400" />
          <span>
            {selectedDeviceId === 'all'
              ? 'All Devices (Fleet)'
              : selectedDevice?.hostname || selectedDeviceId}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {deviceDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setDeviceDropdownOpen(false)}
            />
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-40 py-1 overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Select Scope
              </div>
              <button
                onClick={() => {
                  onSelectDevice('all');
                  setDeviceDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-slate-800/80 transition-colors ${
                  selectedDeviceId === 'all' ? 'text-sky-400 bg-slate-800/40' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>All Devices (Fleet Aggregation)</span>
                </div>
                {selectedDeviceId === 'all' && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>

              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-y border-slate-800 mt-1">
                Individual Devices ({devices.length})
              </div>

              <div className="max-h-60 overflow-y-auto">
                {devices.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400 text-center">
                    No devices registered in dim_device
                  </div>
                ) : (
                  devices.map((dev) => (
                    <button
                      key={dev.device_id}
                      onClick={() => {
                        onSelectDevice(dev.device_id);
                        setDeviceDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-slate-800/80 transition-colors ${
                        selectedDeviceId === dev.device_id
                          ? 'text-sky-400 bg-slate-800/40'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            dev.status === 'online'
                              ? 'bg-emerald-400'
                              : dev.status === 'warning'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span className="truncate">{dev.hostname}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({dev.platform})</span>
                      </div>
                      {selectedDeviceId === dev.device_id && (
                        <Check className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Time Range Buttons, Custom Picker, and Refresh */}
      <div className="flex items-center gap-2">
        {/* Preset Range Buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onChangePreset(preset)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange.preset === preset
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        <div className="relative">
          <button
            onClick={() => {
              setCustomRangeOpen(!customRangeOpen);
              setDeviceDropdownOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              timeRange.preset === 'custom'
                ? 'bg-slate-800 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Custom</span>
          </button>

          {customRangeOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setCustomRangeOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-750 rounded-lg shadow-2xl p-4 z-40">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-3">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Custom Date & Time Window</span>
                </div>
                <form onSubmit={handleCustomSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      From (UTC / Local)
                    </label>
                    <input
                      type="datetime-local"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      To (UTC / Local)
                    </label>
                    <input
                      type="datetime-local"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCustomRangeOpen(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded transition-colors"
                    >
                      Apply Window
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Cached indicator tag */}
        {isCached && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-400 rounded">
            <Database className="w-3 h-3 text-sky-400" />
            cached
          </span>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh telemetry"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
