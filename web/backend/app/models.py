from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class DeviceCapabilities(BaseModel):
    has_cpu: bool = True
    has_ram: bool = True
    has_disk: bool = True
    has_battery: bool = False
    has_environment: bool = False


class DeviceSummary(BaseModel):
    device_key: str
    device_id: str
    hostname: str
    platform: Optional[str] = "Unknown"
    logical_cores: Optional[int] = None
    physical_cores: Optional[int] = None
    last_boot_time_utc: Optional[str] = None
    last_seen: Optional[str] = None
    status: str = "offline"  # "online" | "warning" | "offline"
    capabilities: DeviceCapabilities = Field(default_factory=DeviceCapabilities)


class DeviceListResponse(BaseModel):
    devices: List[DeviceSummary]
    total_count: int
    online_count: int
    warning_count: int
    offline_count: int
    is_cached: bool = False
    warehouse_status: str = "online"


class MetricKPI(BaseModel):
    available: bool = False
    value: Optional[float] = None
    unit: str = "%"
    status: str = "normal"  # "normal" | "warning" | "critical"
    min: Optional[float] = None
    max: Optional[float] = None
    avg: Optional[float] = None
    used_gb: Optional[float] = None
    total_gb: Optional[float] = None
    free_gb: Optional[float] = None
    health_pct: Optional[float] = None
    subtext: Optional[str] = None


class KPISummaryResponse(BaseModel):
    device_id: str
    device_name: str
    time_range_from: str
    time_range_to: str
    cpu: MetricKPI
    ram: MetricKPI
    disk: MetricKPI
    battery: MetricKPI
    temperature: MetricKPI
    humidity: MetricKPI
    is_cached: bool = False
    warehouse_status: str = "online"


class TimeseriesPoint(BaseModel):
    timestamp: str
    value: Optional[float] = None
    secondary_value: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    device_id: Optional[str] = None
    hostname: Optional[str] = None


class TimeseriesResponse(BaseModel):
    metric: str
    device_id: str
    available: bool = True
    points: List[TimeseriesPoint] = []
    is_cached: bool = False
    warehouse_status: str = "online"


class AlertItem(BaseModel):
    id: str
    device_id: str
    hostname: str
    metric: str
    severity: str  # "critical" | "warning" | "info"
    rule_name: str
    message: str
    threshold: str
    current_value: str
    triggered_at: str
    acknowledged: bool = False
    acknowledged_at: Optional[str] = None


class AlertListResponse(BaseModel):
    alerts: List[AlertItem]
    total_count: int
    active_count: int
    critical_count: int
    warning_count: int
    is_cached: bool = False
    warehouse_status: str = "online"


class AlertAcknowledgeRequest(BaseModel):
    acknowledged: bool = True


class HealthResponse(BaseModel):
    status: str  # "ok" | "degraded" | "stopped" | "error"
    warehouse_status: str  # "online" | "starting" | "stopped" | "unconfigured" | "error"
    message: str
    configured: bool
    catalog: str
    schema_name: str
    last_query_ms: Optional[float] = None
    cached_queries: int = 0
