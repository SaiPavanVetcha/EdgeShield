export type DeviceStatus = 'online' | 'warning' | 'offline';

export interface DeviceCapabilities {
  has_cpu: boolean;
  has_ram: boolean;
  has_disk: boolean;
  has_battery: boolean;
  has_environment: boolean;
}

export interface Device {
  device_key: string;
  device_id: string;
  hostname: string;
  platform?: string;
  logical_cores?: number | null;
  physical_cores?: number | null;
  last_boot_time_utc?: string | null;
  last_seen?: string | null;
  status: DeviceStatus;
  capabilities: DeviceCapabilities;
}

export interface DeviceListResponse {
  devices: Device[];
  total_count: number;
  online_count: number;
  warning_count: number;
  offline_count: number;
  is_cached: boolean;
  warehouse_status: string;
}

export interface MetricKPI {
  available: boolean;
  value?: number | null;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  min?: number | null;
  max?: number | null;
  avg?: number | null;
  used_gb?: number | null;
  total_gb?: number | null;
  free_gb?: number | null;
  health_pct?: number | null;
  subtext?: string | null;
}

export interface KPISummaryResponse {
  device_id: string;
  device_name: string;
  time_range_from: string;
  time_range_to: string;
  cpu: MetricKPI;
  ram: MetricKPI;
  disk: MetricKPI;
  battery: MetricKPI;
  temperature: MetricKPI;
  humidity: MetricKPI;
  is_cached: boolean;
  warehouse_status: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  value?: number | null;
  secondary_value?: number | null;
  min?: number | null;
  max?: number | null;
  device_id?: string;
  hostname?: string;
}

export interface TimeseriesResponse {
  metric: string;
  device_id: string;
  available: boolean;
  points: TimeseriesPoint[];
  is_cached: boolean;
  warehouse_status: string;
}

export interface AlertItem {
  id: string;
  device_id: string;
  hostname: string;
  metric: string;
  severity: 'critical' | 'warning' | 'info';
  rule_name: string;
  message: string;
  threshold: string;
  current_value: string;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string | null;
}

export interface AlertListResponse {
  alerts: AlertItem[];
  total_count: number;
  active_count: number;
  critical_count: number;
  warning_count: number;
  is_cached: boolean;
  warehouse_status: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'stopped' | 'unconfigured' | 'error';
  warehouse_status: string;
  message: string;
  configured: boolean;
  catalog: string;
  schema_name: string;
  last_query_ms?: number | null;
  cached_queries: number;
}

export type PresetTimeRange = '1h' | '6h' | '24h' | '7d';

export interface TimeRangeState {
  preset: PresetTimeRange | 'custom';
  from: string; // ISO
  to: string;   // ISO
}

export interface DashboardSettings {
  cpuThreshold: number;
  ramThreshold: number;
  diskThreshold: number;
  tempThreshold: number;
  offlineMinutes: number;
  timezone: 'Local' | 'UTC';
  refreshInterval: number; // in seconds (0 = off)
}
