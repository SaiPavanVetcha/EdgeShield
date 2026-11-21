export interface SpoolStats {
  pending: number;
  max_records: number;
  flush_interval_seconds: number;
  flush_max_records: number;
  last_flush: LastFlushStatus | null;
}

export interface LastFlushStatus {
  success: boolean | null;
  time: string | null;
  inserted: number;
  failed: number;
  pending: number;
  error?: string | null;
}

export interface DeviceCounts {
  total: number;
  online: number;
}

export interface ConsoleStatusResponse {
  status: string;
  server_online: boolean;
  host: string;
  port: number;
  listen_host: string;
  listen_port: number;
  advertised_host: string;
  advertised_url: string;
  uptime_seconds: number;
  storage_mode: 'local' | 'databricks';
  databricks_configured: boolean;
  pending: number;
  records_received?: number;
  records_inserted_to_cloud?: number;
  last_flush: LastFlushStatus | null;
  spool: SpoolStats;
  devices: DeviceCounts;
}

export interface RegisteredDevice {
  device_id: string;
  hostname: string;
  type?: string;
  platform?: string;
  room?: string | null;
  client_ip?: string;
  first_seen_utc?: string;
  last_seen_utc?: string;
  last_event_timestamp?: string;
  payload_count: number;
  is_online: boolean;
  seconds_since_seen?: number;
}

export interface DeviceListResponse {
  total: number;
  online: number;
  devices: RegisteredDevice[];
}

export interface StorageModeUpdateResponse {
  status: string;
  storage_mode: 'local' | 'databricks';
  mode?: string;
  inserted?: number;
  failed?: number;
  pending_remaining?: number;
  flush?: FlushResponse;
  message: string;
  console_status: ConsoleStatusResponse;
}

export interface FlushResponse {
  status: string;
  storage_mode?: string;
  mode?: string;
  inserted?: number;
  flushed?: number;
  failed?: number;
  pending?: number;
  pending_remaining?: number;
  message: string;
  last_flush?: LastFlushStatus | null;
}

export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  logger: string;
  message: string;
}

export interface LogsResponse {
  total: number;
  limit: number;
  logs: LogEntry[];
}
