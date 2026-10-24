import React, { useMemo } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  BatteryCharging,
  Thermometer,
  Droplets,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { WarehouseAlertBanner } from '../components/WarehouseAlertBanner';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { KPISkeleton, ChartSkeleton } from '../components/SkeletonLoader';
import { useTelemetry } from '../hooks/useTelemetry';

export const DashboardPage: React.FC = () => {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    timeRange,
    handleSelectPreset,
    handleApplyCustomRange,
    kpis,
    cpuTs,
    ramTs,
    diskTs,
    batteryTs,
    envTs,
    isLoading,
    isWakingUp,
    warehouseStatus,
    isCached,
    refreshAll,
    handleWakeUpWarehouse,
  } = useTelemetry();

  // Prepare chart datasets
  const cpuData = useMemo(() => {
    if (!cpuTs?.points) return [];
    return cpuTs.points.map((p) => ({
      timestamp: p.timestamp,
      cpu: p.value,
    }));
  }, [cpuTs]);

  const memoryStorageData = useMemo(() => {
    if (!ramTs?.points || ramTs.points.length === 0) return [];
    const diskMap = new Map((diskTs?.points || []).map((p) => [p.timestamp, p.value]));
    return ramTs.points.map((p) => ({
      timestamp: p.timestamp,
      ram: p.value,
      disk: diskMap.get(p.timestamp) ?? null,
    }));
  }, [ramTs, diskTs]);

  const envData = useMemo(() => {
    if (!envTs?.points || envTs.points.length === 0) return [];
    return envTs.points.map((p) => ({
      timestamp: p.timestamp,
      temp: p.value,
      humidity: p.secondary_value,
    }));
  }, [envTs]);

  const batteryData = useMemo(() => {
    if (!batteryTs?.points || batteryTs.points.length === 0) return [];
    return batteryTs.points.map((p) => ({
      timestamp: p.timestamp,
      level: p.value,
      health: p.secondary_value,
    }));
  }, [batteryTs]);

  const hasAnyKpi =
    kpis &&
    (kpis.cpu?.available ||
      kpis.ram?.available ||
      kpis.disk?.available ||
      kpis.battery?.available ||
      kpis.temperature?.available ||
      kpis.humidity?.available);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-y-auto">
      {/* Top Bar - Device selector, time presets, custom picker, refresh */}
      <TopBar
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        timeRange={timeRange}
        onChangePreset={handleSelectPreset}
        onApplyCustomRange={handleApplyCustomRange}
        onRefresh={refreshAll}
        isLoading={isLoading}
        isCached={isCached}
      />

      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Databricks Free Tier Auto-Stop Alert / Wake Up Banner */}
        <WarehouseAlertBanner
          warehouseStatus={warehouseStatus}
          onWakeUp={handleWakeUpWarehouse}
          isWakingUp={isWakingUp}
        />

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              {selectedDeviceId === 'all'
                ? 'Fleet Telemetry Overview'
                : `Device: ${devices.find((d) => d.device_id === selectedDeviceId)?.hostname || selectedDeviceId}`}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live observability powered by Databricks Gold Layer (edgeshield_lakehouse.gold)
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && !kpis && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <KPISkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <ChartSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* Empty State when no data is returned */}
        {!isLoading && !hasAnyKpi && warehouseStatus === 'online' && (
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No Telemetry Recorded in Window</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              No telemetry events found for the selected time range ({timeRange.preset}). Try expanding the time window to 7d or check if edge clients are actively transmitting events to Databricks.
            </p>
          </div>
        )}

        {/* KPI Cards Grid (Maximum 6, auto-hiding cards that have no data) */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard
              title="CPU"
              kpi={kpis.cpu}
              icon={Cpu}
              colorClass="text-sky-400"
            />
            <KPICard
              title="RAM"
              kpi={kpis.ram}
              icon={Layers}
              colorClass="text-indigo-400"
            />
            <KPICard
              title="Disk"
              kpi={kpis.disk}
              icon={HardDrive}
              colorClass="text-amber-400"
            />
            <KPICard
              title="Battery"
              kpi={kpis.battery}
              icon={BatteryCharging}
              colorClass="text-purple-400"
            />
            <KPICard
              title="Temperature"
              kpi={kpis.temperature}
              icon={Thermometer}
              colorClass="text-rose-400"
            />
            <KPICard
              title="Humidity"
              kpi={kpis.humidity}
              icon={Droplets}
              colorClass="text-cyan-400"
            />
          </div>
        )}

        {/* Telemetry Charts (Maximum 4 charts, clean lines, auto-hiding if no data) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: CPU Utilization */}
          <ChartCard
            title="CPU Utilization"
            subtitle="Processing load percentage over time"
            data={cpuData}
            available={Boolean(cpuTs?.available && cpuData.length > 0)}
            yDomain={[0, 100]}
            lines={[
              {
                key: 'cpu',
                name: 'CPU %',
                color: '#38bdf8', // sky-400
                unit: '%',
              },
            ]}
          />

          {/* Chart 2: RAM & Disk Utilization */}
          <ChartCard
            title="Memory & Storage"
            subtitle="RAM and local mount point utilization"
            data={memoryStorageData}
            available={Boolean(ramTs?.available && memoryStorageData.length > 0)}
            yDomain={[0, 100]}
            lines={[
              {
                key: 'ram',
                name: 'RAM %',
                color: '#818cf8', // indigo-400
                unit: '%',
              },
              {
                key: 'disk',
                name: 'Disk %',
                color: '#f59e0b', // amber-500
                unit: '%',
              },
            ]}
          />

          {/* Chart 3: Ambient Environment (Hidden if device has no env telemetry) */}
          <ChartCard
            title="Ambient Environment"
            subtitle="ESP32 external sensor temperature and humidity"
            data={envData}
            available={Boolean(envTs?.available && envData.length > 0)}
            yDomain={[0, 100]}
            lines={[
              {
                key: 'temp',
                name: 'Temp (°C)',
                color: '#f43f5e', // rose-500
                unit: '°C',
              },
              {
                key: 'humidity',
                name: 'Humidity (%)',
                color: '#06b6d4', // cyan-500
                unit: '%',
              },
            ]}
          />

          {/* Chart 4: Battery & Power (Hidden if device has no battery telemetry) */}
          <ChartCard
            title="Power & Battery"
            subtitle="Current charge level and battery health capacity"
            data={batteryData}
            available={Boolean(batteryTs?.available && batteryData.length > 0)}
            yDomain={[0, 100]}
            lines={[
              {
                key: 'level',
                name: 'Battery Level %',
                color: '#c084fc', // purple-400
                unit: '%',
              },
              {
                key: 'health',
                name: 'Health %',
                color: '#10b981', // emerald-500
                unit: '%',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
