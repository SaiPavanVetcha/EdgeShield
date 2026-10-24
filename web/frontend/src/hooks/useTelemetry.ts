import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  Device,
  KPISummaryResponse,
  TimeseriesResponse,
  AlertListResponse,
  HealthResponse,
  PresetTimeRange,
  TimeRangeState,
} from '../types';

export function useTelemetry() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);
  const [warehouseStatus, setWarehouseStatus] = useState<string>('online');
  const [isCached, setIsCached] = useState<boolean>(false);

  // Time range calculation helper
  const calculatePresetRange = (preset: PresetTimeRange): { from: string; to: string } => {
    const to = new Date();
    const from = new Date();
    if (preset === '1h') from.setHours(to.getHours() - 1);
    else if (preset === '6h') from.setHours(to.getHours() - 6);
    else if (preset === '24h') from.setHours(to.getHours() - 24);
    else if (preset === '7d') from.setDate(to.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const [timeRange, setTimeRange] = useState<TimeRangeState>(() => {
    const range = calculatePresetRange('24h');
    return { preset: '24h', from: range.from, to: range.to };
  });

  const [kpis, setKpis] = useState<KPISummaryResponse | null>(null);
  const [cpuTs, setCpuTs] = useState<TimeseriesResponse | null>(null);
  const [ramTs, setRamTs] = useState<TimeseriesResponse | null>(null);
  const [diskTs, setDiskTs] = useState<TimeseriesResponse | null>(null);
  const [batteryTs, setBatteryTs] = useState<TimeseriesResponse | null>(null);
  const [envTs, setEnvTs] = useState<TimeseriesResponse | null>(null);

  const [alerts, setAlerts] = useState<AlertListResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHealth(res);
      setWarehouseStatus(res.warehouse_status);
      return res;
    } catch {
      // keep previous
      return null;
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.getDevices();
      setDevices(res.devices);
      if (res.warehouse_status) setWarehouseStatus(res.warehouse_status);
      if (res.is_cached) setIsCached(true);
    } catch {
      // silent fallback
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.getAlerts();
      setAlerts(res);
      if (res.warehouse_status) setWarehouseStatus(res.warehouse_status);
    } catch {
      // silent fallback
    }
  }, []);

  const fetchTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kpiRes, cpuRes, ramRes, diskRes, battRes, envRes] = await Promise.all([
        api.getKPIs(selectedDeviceId, timeRange.from, timeRange.to),
        api.getTimeseries(selectedDeviceId, 'cpu', timeRange.from, timeRange.to),
        api.getTimeseries(selectedDeviceId, 'ram', timeRange.from, timeRange.to),
        api.getTimeseries(selectedDeviceId, 'disk', timeRange.from, timeRange.to),
        api.getTimeseries(selectedDeviceId, 'battery', timeRange.from, timeRange.to),
        api.getTimeseries(selectedDeviceId, 'environment', timeRange.from, timeRange.to),
      ]);

      setKpis(kpiRes);
      setCpuTs(cpuRes);
      setRamTs(ramRes);
      setDiskTs(diskRes);
      setBatteryTs(battRes);
      setEnvTs(envRes);

      if (kpiRes.warehouse_status) setWarehouseStatus(kpiRes.warehouse_status);
      setIsCached(kpiRes.is_cached);
    } catch {
      // silent fallback
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId, timeRange.from, timeRange.to]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchHealth(), fetchDevices(), fetchAlerts(), fetchTelemetry()]);
  }, [fetchHealth, fetchDevices, fetchAlerts, fetchTelemetry]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling loop when warehouse is waking up
  useEffect(() => {
    if (warehouseStatus !== 'starting' && !isWakingUp) return;

    const interval = setInterval(async () => {
      const h = await fetchHealth();
      if (h && h.warehouse_status === 'online') {
        setIsWakingUp(false);
        refreshAll();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [warehouseStatus, isWakingUp, fetchHealth, refreshAll]);

  const handleSelectPreset = (preset: PresetTimeRange) => {
    const range = calculatePresetRange(preset);
    setTimeRange({ preset, from: range.from, to: range.to });
  };

  const handleApplyCustomRange = (from: string, to: string) => {
    setTimeRange({ preset: 'custom', from, to });
  };

  const handleWakeUpWarehouse = async () => {
    setIsWakingUp(true);
    setWarehouseStatus('starting');
    try {
      await api.wakeUpWarehouse();
    } catch {
      // polling will resolve
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      await fetchAlerts();
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  return {
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
    alerts,
    health,
    isLoading,
    isWakingUp,
    warehouseStatus,
    isCached,
    refreshAll,
    handleWakeUpWarehouse,
    handleAcknowledgeAlert,
  };
}
