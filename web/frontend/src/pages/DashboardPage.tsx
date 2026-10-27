import React, { useMemo } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  BatteryCharging,
  Thermometer,
  Droplets,
  Server,
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { WarehouseAlertBanner } from '../components/WarehouseAlertBanner';
import { KPICard } from '../components/KPICard';
import { ChartCard } from '../components/ChartCard';
import { KPISkeleton, ChartSkeleton } from '../components/SkeletonLoader';
import { useTelemetry } from '../hooks/useTelemetry';

interface DashboardChartConfig {
  id: string;
  title: string;
  subtitle: string;
  data: any[];
  available: boolean;
  yDomain: [number, number];
  lines: Array<{
    key: string;
    name: string;
    color: string;
    unit: string;
  }>;
}

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

  // Prepare individual chart datasets
  const cpuData = useMemo(() => {
    if (!cpuTs?.points || cpuTs.points.length === 0) return [];
    return cpuTs.points.map((p) => ({
      timestamp: p.timestamp,
      cpu: p.value,
    }));
  }, [cpuTs]);

  const ramData = useMemo(() => {
    if (!ramTs?.points || ramTs.points.length === 0) return [];
    return ramTs.points.map((p) => ({
      timestamp: p.timestamp,
      ram: p.value,
    }));
  }, [ramTs]);

  const diskData = useMemo(() => {
    if (!diskTs?.points || diskTs.points.length === 0) return [];
    return diskTs.points.map((p) => ({
      timestamp: p.timestamp,
      disk: p.value,
    }));
  }, [diskTs]);

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

  // Defined in strict priority order for Hero Chart selection:
  // 1. CPU Utilization (highest priority)
  // 2. RAM Utilization
  // 3. Disk Utilization
  // 4. Ambient Environment (Temperature + Humidity)
  // 5. Power & Battery
  const allCharts: DashboardChartConfig[] = useMemo(
    () => [
      {
        id: 'cpu',
        title: 'CPU Utilization',
        subtitle: 'Processing load percentage over time',
        data: cpuData,
        available: Boolean(cpuTs?.available && cpuData.length > 0),
        yDomain: [0, 100],
        lines: [
          {
            key: 'cpu',
            name: 'CPU %',
            color: '#38bdf8', // sky-400
            unit: '%',
          },
        ],
      },
      {
        id: 'ram',
        title: 'RAM Utilization',
        subtitle: 'System memory consumption over time',
        data: ramData,
        available: Boolean(ramTs?.available && ramData.length > 0),
        yDomain: [0, 100],
        lines: [
          {
            key: 'ram',
            name: 'RAM %',
            color: '#818cf8', // indigo-400
            unit: '%',
          },
        ],
      },
      {
        id: 'disk',
        title: 'Disk Utilization',
        subtitle: 'Storage capacity and partition usage',
        data: diskData,
        available: Boolean(diskTs?.available && diskData.length > 0),
        yDomain: [0, 100],
        lines: [
          {
            key: 'disk',
            name: 'Disk %',
            color: '#f59e0b', // amber-500
            unit: '%',
          },
        ],
      },
      {
        id: 'env',
        title: 'Ambient Environment',
        subtitle: 'ESP32 external sensor temperature and humidity',
        data: envData,
        available: Boolean(envTs?.available && envData.length > 0),
        yDomain: [0, 100],
        lines: [
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
        ],
      },
      {
        id: 'battery',
        title: 'Power & Battery',
        subtitle: 'Current charge level and battery health capacity',
        data: batteryData,
        available: Boolean(batteryTs?.available && batteryData.length > 0),
        yDomain: [0, 100],
        lines: [
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
        ],
      },
    ],
    [cpuData, cpuTs, ramData, ramTs, diskData, diskTs, envData, envTs, batteryData, batteryTs]
  );

  // Available charts that have actual data
  const availableCharts = useMemo(
    () => allCharts.filter((c) => c.available),
    [allCharts]
  );

  // The highest priority available chart is the Hero Chart (full width, larger height)
  // Remaining available charts go into the 2-column grid below
  const heroChart = availableCharts[0] ?? null;
  const secondaryCharts = availableCharts.slice(1);

  const hasAnyKpi =
    kpis &&
    (kpis.cpu?.available ||
      kpis.ram?.available ||
      kpis.disk?.available ||
      kpis.battery?.available ||
      kpis.temperature?.available ||
      kpis.humidity?.available);

  const hasAnyChart = availableCharts.length > 0;

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

      <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Databricks Free Tier Auto-Stop Alert / Wake Up Banner */}
        <WarehouseAlertBanner
          warehouseStatus={warehouseStatus}
          onWakeUp={handleWakeUpWarehouse}
          isWakingUp={isWakingUp}
        />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {selectedDeviceId === 'all'
                ? 'Fleet Telemetry Overview'
                : `Device: ${devices.find((d) => d.device_id === selectedDeviceId)?.hostname || selectedDeviceId}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live observability powered by Databricks Gold Layer (edgeshield_lakehouse.gold)
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && !kpis && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
              {[...Array(6)].map((_, i) => (
                <KPISkeleton key={i} />
              ))}
            </div>
            <div className="space-y-6">
              <ChartSkeleton isHero={true} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <ChartSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State when no data is returned */}
        {!isLoading && !hasAnyKpi && !hasAnyChart && warehouseStatus === 'online' && (
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

        {/* KPI Cards Grid (All available cards, spacious gap-5 layout) */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
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

        {/* Telemetry Charts - Hierarchical Structure */}
        {heroChart && (
          <div className="space-y-6">
            {/* 1. PRIMARY / HERO CHART (full width, larger height) */}
            <ChartCard
              key={heroChart.id}
              title={heroChart.title}
              subtitle={heroChart.subtitle}
              data={heroChart.data}
              available={heroChart.available}
              yDomain={heroChart.yDomain}
              lines={heroChart.lines}
              isHero={true}
            />

            {/* 2. SECONDARY CHARTS (2-column grid below hero) */}
            {secondaryCharts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {secondaryCharts.map((chart, index) => {
                  const isLastOdd =
                    secondaryCharts.length % 2 === 1 &&
                    index === secondaryCharts.length - 1;
                  return (
                    <div
                      key={chart.id}
                      className={isLastOdd ? 'col-span-1 lg:col-span-2' : ''}
                    >
                      <ChartCard
                        title={chart.title}
                        subtitle={chart.subtitle}
                        data={chart.data}
                        available={chart.available}
                        yDomain={chart.yDomain}
                        lines={chart.lines}
                        isHero={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
