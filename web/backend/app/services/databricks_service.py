import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.config import settings
from app.database import db_manager
from app.models import (
    DeviceSummary,
    DeviceCapabilities,
    DeviceListResponse,
    MetricKPI,
    KPISummaryResponse,
    TimeseriesPoint,
    TimeseriesResponse,
)
from app.validation import (
    validate_device_id,
    validate_room,
    validate_timestamp,
    validate_metric,
    validate_device_key,
    validate_trunc_grain,
    ALLOWED_METRICS,
)

logger = logging.getLogger("edgeshield.databricks_service")


class DatabricksService:
    def __init__(self):
        self.prefix = settings.gold_table_prefix

    def _format_timestamp(self, dt: Any) -> str:
        if isinstance(dt, datetime):
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        return str(dt)

    def get_devices(self, room: Optional[str] = None) -> DeviceListResponse:
        """
        Query dim_device and calculate real-time status and telemetry capabilities.
        Optionally filter by room.
        """
        cache_key = f"devices_list_{room}" if room and room != "all" else "devices_list"
        # 1. Fetch devices from dim_device
        try:
            sql_dim = f"""
                SELECT
                    device_key,
                    device_id,
                    hostname,
                    room,
                    platform,
                    logical_cores,
                    physical_cores,
                    last_boot_time_utc,
                    _updated_at
                FROM {self.prefix}.dim_device
                ORDER BY hostname ASC
            """
            dim_rows, is_cached, status = db_manager.execute_query(sql_dim, cache_key=cache_key)
        except Exception:
            sql_dim = f"""
                SELECT
                    device_key,
                    device_id,
                    hostname,
                    platform,
                    logical_cores,
                    physical_cores,
                    last_boot_time_utc,
                    _updated_at
                FROM {self.prefix}.dim_device
                ORDER BY hostname ASC
            """
            dim_rows, is_cached, status = db_manager.execute_query(sql_dim, cache_key=cache_key)

        if not dim_rows:
            return DeviceListResponse(
                devices=[],
                total_count=0,
                online_count=0,
                warning_count=0,
                offline_count=0,
                is_cached=is_cached,
                warehouse_status=status,
            )

        if room and room != "all":
            dim_rows = [r for r in dim_rows if (r.get("room") or "").strip() == room.strip()]

        # 2. Get latest event_timestamp per device to calculate last_seen and online status
        sql_last_seen = f"""
            SELECT
                device_key,
                MAX(event_timestamp) AS last_seen
            FROM (
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_cpu_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_ram_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_disk_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_battery_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_environment_telemetry
            ) all_events
            GROUP BY device_key
        """
        last_seen_rows, _, _ = db_manager.execute_query(sql_last_seen, cache_key="devices_last_seen", use_cache=True)
        last_seen_map = {row["device_key"]: row.get("last_seen") for row in last_seen_rows}

        # 3. Check capabilities (battery, environment)
        # Only devices that have reported non-null battery percentage have an actual battery (laptops vs desktops)
        sql_battery_devs = f"SELECT DISTINCT device_key FROM {self.prefix}.fact_battery_telemetry WHERE battery_pct IS NOT NULL"
        battery_rows, _, _ = db_manager.execute_query(sql_battery_devs, cache_key="devs_battery", use_cache=True)
        battery_keys = {row["device_key"] for row in battery_rows}

        sql_env_devs = f"SELECT DISTINCT device_key FROM {self.prefix}.fact_environment_telemetry"
        env_rows, _, _ = db_manager.execute_query(sql_env_devs, cache_key="devs_env", use_cache=True)
        env_keys = {row["device_key"] for row in env_rows}

        now_utc = datetime.now(timezone.utc)
        devices: List[DeviceSummary] = []
        online_count = 0
        warning_count = 0
        offline_count = 0

        for row in dim_rows:
            dev_key = row["device_key"]
            ls_raw = last_seen_map.get(dev_key)

            # Determine online / warning / offline status based on > 3 min threshold
            dev_status = "offline"
            if ls_raw:
                try:
                    if isinstance(ls_raw, str):
                        # Attempt parsing ISO or SQL format
                        ls_clean = ls_raw.replace("T", " ").split(".")[0]
                        ls_dt = datetime.strptime(ls_clean, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                    elif isinstance(ls_raw, datetime):
                        ls_dt = ls_raw if ls_raw.tzinfo else ls_raw.replace(tzinfo=timezone.utc)
                    else:
                        ls_dt = None

                    if ls_dt:
                        diff_sec = (now_utc - ls_dt).total_seconds()
                        if diff_sec <= 180:  # <= 3 minutes
                            dev_status = "online"
                        elif diff_sec <= 600:  # <= 10 minutes
                            dev_status = "warning"
                        else:
                            dev_status = "offline"
                except Exception:
                    dev_status = "offline"

            if dev_status == "online":
                online_count += 1
            elif dev_status == "warning":
                warning_count += 1
            else:
                offline_count += 1

            capabilities = DeviceCapabilities(
                has_cpu=True,
                has_ram=True,
                has_disk=True,
                has_battery=dev_key in battery_keys,
                has_environment=dev_key in env_keys,
            )

            devices.append(
                DeviceSummary(
                    device_key=dev_key,
                    device_id=row["device_id"],
                    hostname=row.get("hostname") or row["device_id"],
                    room=row.get("room"),
                    platform=row.get("platform") or "Unknown",
                    logical_cores=row.get("logical_cores"),
                    physical_cores=row.get("physical_cores"),
                    last_boot_time_utc=str(row.get("last_boot_time_utc")) if row.get("last_boot_time_utc") else None,
                    last_seen=str(ls_raw) if ls_raw else None,
                    status=dev_status,
                    capabilities=capabilities,
                )
            )

        return DeviceListResponse(
            devices=devices,
            total_count=len(devices),
            online_count=online_count,
            warning_count=warning_count,
            offline_count=offline_count,
            is_cached=is_cached,
            warehouse_status=status,
        )

    def _resolve_device_key(self, device_id: str) -> Optional[str]:
        if not device_id or device_id.lower() == "all":
            return None
        safe_dev_id = validate_device_id(device_id)
        sql = f"SELECT device_key FROM {self.prefix}.dim_device WHERE device_id = :device_id LIMIT 1"
        rows, _, _ = db_manager.execute_query(sql, params={"device_id": safe_dev_id}, cache_key=f"dev_key_{safe_dev_id}")
        if rows:
            return validate_device_key(rows[0]["device_key"])
        return None

    def get_kpis(self, device_id: str, from_ts: str, to_ts: str, room: Optional[str] = None) -> KPISummaryResponse:
        """
        Calculates KPIs for CPU, RAM, Disk, Battery, Temperature, Humidity.
        Each metric is queried independently to handle ESP32 / PC client timestamp mismatches.
        Uses parameterized queries with strict validation.
        """
        safe_dev_id = validate_device_id(device_id)
        safe_room = validate_room(room)
        safe_from_ts = validate_timestamp(from_ts)
        safe_to_ts = validate_timestamp(to_ts)

        device_key = None
        device_name = "Fleet Overview"
        resolved_room = None

        if safe_dev_id != "all":
            try:
                sql_dev = f"SELECT device_key, hostname, room FROM {self.prefix}.dim_device WHERE device_id = :device_id LIMIT 1"
                dev_rows, _, _ = db_manager.execute_query(sql_dev, params={"device_id": safe_dev_id}, cache_key=f"dev_meta_{safe_dev_id}")
                if dev_rows:
                    device_key = validate_device_key(dev_rows[0]["device_key"])
                    device_name = dev_rows[0].get("hostname") or safe_dev_id
                    resolved_room = dev_rows[0].get("room")
            except Exception:
                device_key = self._resolve_device_key(safe_dev_id)
                device_name = safe_dev_id
        elif safe_room and safe_room != "all":
            device_name = f"Fleet Overview ({safe_room})"
            resolved_room = safe_room

        base_conds = []
        params: Dict[str, Any] = {}

        if device_key:
            base_conds.append("device_key = :device_key")
            params["device_key"] = device_key
        elif safe_room and safe_room != "all":
            base_conds.append(f"device_key IN (SELECT device_key FROM {self.prefix}.dim_device WHERE room = :room)")
            params["room"] = safe_room

        if safe_from_ts and safe_from_ts > "2020-01-01 00:00:00":
            base_conds.append("event_timestamp >= :from_ts")
            base_conds.append("event_timestamp <= :to_ts")
            params["from_ts"] = safe_from_ts
            params["to_ts"] = safe_to_ts
        else:
            base_conds.append("event_timestamp <= :to_ts")
            params["to_ts"] = safe_to_ts

        base_where = "WHERE " + " AND ".join(base_conds)
        batt_where = "WHERE " + " AND ".join(["battery_pct IS NOT NULL"] + base_conds)

        cache_key = f"kpis_{safe_dev_id}_{safe_room}_{safe_from_ts}_{safe_to_ts}"

        # Default empty response
        res = KPISummaryResponse(
            device_id=safe_dev_id,
            device_name=device_name,
            room=resolved_room,
            time_range_from=safe_from_ts,
            time_range_to=safe_to_ts,
            cpu=MetricKPI(available=False, unit="%"),
            ram=MetricKPI(available=False, unit="%"),
            disk=MetricKPI(available=False, unit="%"),
            battery=MetricKPI(available=False, unit="%"),
            temperature=MetricKPI(available=False, unit="°C"),
            humidity=MetricKPI(available=False, unit="%"),
            is_cached=False,
            warehouse_status="online",
        )

        # 1. CPU KPI
        sql_cpu = f"""
            SELECT
                AVG(cpu_utilization_pct) AS avg_cpu,
                MIN(cpu_utilization_pct) AS min_cpu,
                MAX(cpu_utilization_pct) AS max_cpu
            FROM {self.prefix}.fact_cpu_telemetry
            {base_where}
        """
        cpu_rows, is_cached, status = db_manager.execute_query(sql_cpu, params=params, cache_key=f"{cache_key}_cpu")
        res.is_cached = is_cached
        res.warehouse_status = status

        if cpu_rows and cpu_rows[0].get("avg_cpu") is not None:
            avg_c = round(float(cpu_rows[0]["avg_cpu"]), 1)
            min_c = round(float(cpu_rows[0]["min_cpu"]), 1)
            max_c = round(float(cpu_rows[0]["max_cpu"]), 1)
            cpu_status = "critical" if avg_c > 85 else ("warning" if avg_c > 70 else "normal")
            res.cpu = MetricKPI(
                available=True,
                value=avg_c,
                avg=avg_c,
                min=min_c,
                max=max_c,
                unit="%",
                status=cpu_status,
                subtext=f"Min: {min_c}%  Max: {max_c}%",
            )

        # 2. RAM KPI
        sql_ram = f"""
            SELECT
                AVG(ram_utilization_pct) AS avg_ram,
                AVG(ram_used_bytes) / 1073741824.0 AS avg_used_gb,
                (AVG(ram_used_bytes) + AVG(ram_available_bytes)) / 1073741824.0 AS total_gb
            FROM {self.prefix}.fact_ram_telemetry
            {base_where}
        """
        ram_rows, _, _ = db_manager.execute_query(sql_ram, params=params, cache_key=f"{cache_key}_ram")
        if ram_rows and ram_rows[0].get("avg_ram") is not None:
            avg_r = round(float(ram_rows[0]["avg_ram"]), 1)
            used_g = round(float(ram_rows[0]["avg_used_gb"]), 1) if ram_rows[0].get("avg_used_gb") else None
            tot_g = round(float(ram_rows[0]["total_gb"]), 1) if ram_rows[0].get("total_gb") else None
            ram_status = "critical" if avg_r > 90 else ("warning" if avg_r > 80 else "normal")
            subtext = f"{used_g} GB / {tot_g} GB" if used_g and tot_g else None
            res.ram = MetricKPI(
                available=True,
                value=avg_r,
                avg=avg_r,
                used_gb=used_g,
                total_gb=tot_g,
                unit="%",
                status=ram_status,
                subtext=subtext,
            )

        # 3. Disk KPI
        sql_disk = f"""
            SELECT
                AVG(disk_utilization_pct) AS avg_disk,
                AVG(disk_free_gb) AS avg_free_gb
            FROM {self.prefix}.fact_disk_telemetry
            {base_where}
        """
        disk_rows, _, _ = db_manager.execute_query(sql_disk, params=params, cache_key=f"{cache_key}_disk")
        if disk_rows and disk_rows[0].get("avg_disk") is not None:
            avg_d = round(float(disk_rows[0]["avg_disk"]), 1)
            free_g = round(float(disk_rows[0]["avg_free_gb"]), 1) if disk_rows[0].get("avg_free_gb") else None
            disk_status = "critical" if avg_d > 90 else ("warning" if avg_d > 80 else "normal")
            res.disk = MetricKPI(
                available=True,
                value=avg_d,
                avg=avg_d,
                free_gb=free_g,
                unit="%",
                status=disk_status,
                subtext=f"{free_g} GB free" if free_g is not None else None,
            )

        # 4. Battery KPI (only compute for devices reporting battery_pct IS NOT NULL)
        sql_battery = f"""
            SELECT
                AVG(battery_pct) AS avg_battery,
                AVG(battery_health_pct) AS avg_health
            FROM {self.prefix}.fact_battery_telemetry
            {batt_where}
        """
        battery_rows, _, _ = db_manager.execute_query(sql_battery, params=params, cache_key=f"{cache_key}_battery")
        if battery_rows and battery_rows[0].get("avg_battery") is not None:
            avg_b = round(float(battery_rows[0]["avg_battery"]), 1)
            avg_h = round(float(battery_rows[0]["avg_health"]), 1) if battery_rows[0].get("avg_health") else None
            b_status = "critical" if avg_b < 20 else ("warning" if avg_b < 35 else "normal")
            res.battery = MetricKPI(
                available=True,
                value=avg_b,
                avg=avg_b,
                health_pct=avg_h,
                unit="%",
                status=b_status,
                subtext=f"Health: {avg_h}%" if avg_h is not None else None,
            )

        # 5. Environment Telemetry (Temperature & Humidity)
        sql_env = f"""
            SELECT
                AVG(temperature_c) AS avg_temp,
                MIN(temperature_c) AS min_temp,
                MAX(temperature_c) AS max_temp,
                AVG(humidity_percent) AS avg_humidity
            FROM {self.prefix}.fact_environment_telemetry
            {base_where}
        """
        env_rows, _, _ = db_manager.execute_query(sql_env, params=params, cache_key=f"{cache_key}_env")
        if env_rows and env_rows[0].get("avg_temp") is not None:
            avg_t = round(float(env_rows[0]["avg_temp"]), 1)
            min_t = round(float(env_rows[0]["min_temp"]), 1)
            max_t = round(float(env_rows[0]["max_temp"]), 1)
            t_status = "critical" if avg_t > 35 else ("warning" if avg_t > 30 else "normal")
            res.temperature = MetricKPI(
                available=True,
                value=avg_t,
                avg=avg_t,
                min=min_t,
                max=max_t,
                unit="°C",
                status=t_status,
                subtext=f"Min: {min_t}°C  Max: {max_t}°C",
            )

            if env_rows[0].get("avg_humidity") is not None:
                avg_h = round(float(env_rows[0]["avg_humidity"]), 1)
                res.humidity = MetricKPI(
                    available=True,
                    value=avg_h,
                    avg=avg_h,
                    unit="%",
                    status="normal",
                    subtext="Ambient Humidity",
                )

        return res

    def get_timeseries(
        self,
        metric: str,
        device_id: str,
        from_ts: str,
        to_ts: str,
        room: Optional[str] = None,
    ) -> TimeseriesResponse:
        """
        Fetches downsampled or aggregated time series points for charting.
        Uses parameterized queries with strict validation.
        """
        safe_dev_id = validate_device_id(device_id)
        safe_metric = validate_metric(metric)
        safe_room = validate_room(room)
        safe_from_ts = validate_timestamp(from_ts)
        safe_to_ts = validate_timestamp(to_ts)

        device_key = self._resolve_device_key(safe_dev_id) if safe_dev_id != "all" else None
        cache_key = f"ts_{safe_metric}_{safe_dev_id}_{safe_room}_{safe_from_ts}_{safe_to_ts}"

        # Choose table and column expressions via strict dictionary lookup (NO string interpolation from input)
        METRIC_MAP = {
            "cpu": (f"{self.prefix}.fact_cpu_telemetry", "cpu_utilization_pct", "cpu_freq_current_mhz"),
            "ram": (f"{self.prefix}.fact_ram_telemetry", "ram_utilization_pct", "ram_used_bytes / 1073741824.0"),
            "disk": (f"{self.prefix}.fact_disk_telemetry", "disk_utilization_pct", "disk_free_gb"),
            "battery": (f"{self.prefix}.fact_battery_telemetry", "battery_pct", "battery_health_pct"),
            "temperature": (f"{self.prefix}.fact_environment_telemetry", "temperature_c", "humidity_percent"),
            "environment": (f"{self.prefix}.fact_environment_telemetry", "temperature_c", "humidity_percent"),
            "humidity": (f"{self.prefix}.fact_environment_telemetry", "humidity_percent", "temperature_c"),
        }

        if safe_metric not in METRIC_MAP:
            return TimeseriesResponse(metric=safe_metric, device_id=safe_dev_id, available=False, points=[])

        table_name, val_expr, sec_expr = METRIC_MAP[safe_metric]

        where_conds = []
        params: Dict[str, Any] = {}

        if device_key:
            where_conds.append("device_key = :device_key")
            params["device_key"] = device_key
        elif safe_room and safe_room != "all":
            where_conds.append(f"device_key IN (SELECT device_key FROM {self.prefix}.dim_device WHERE room = :room)")
            params["room"] = safe_room

        if safe_metric == "battery":
            where_conds.append("battery_pct IS NOT NULL")

        # Time filter: if from_ts is very early (e.g. 2020-01-01), treat as no lower bound
        if safe_from_ts and safe_from_ts > "2020-01-01 00:00:00":
            where_conds.append("event_timestamp >= :from_ts")
            where_conds.append("event_timestamp <= :to_ts")
            params["from_ts"] = safe_from_ts
            params["to_ts"] = safe_to_ts
        else:
            where_conds.append("event_timestamp <= :to_ts")
            params["to_ts"] = safe_to_ts

        where_clause = "WHERE " + " AND ".join(where_conds)

        # Adaptive truncation grain and limits:
        trunc_grain = "minute"
        limit_points = 500
        try:
            from_dt = datetime.strptime(safe_from_ts, "%Y-%m-%d %H:%M:%S")
            to_dt = datetime.strptime(safe_to_ts, "%Y-%m-%d %H:%M:%S")
            diff_hours = (to_dt - from_dt).total_seconds() / 3600.0
        except Exception:
            diff_hours = 24.0

        if not safe_from_ts or safe_from_ts <= "2020-01-01 00:00:00" or diff_hours > 168:
            trunc_grain = "hour"
            limit_points = 1000
        elif diff_hours > 24:
            trunc_grain = "hour"
            limit_points = 500
        else:
            trunc_grain = "minute"
            limit_points = 500

        safe_grain = validate_trunc_grain(trunc_grain)
        safe_limit = int(limit_points)

        sql = f"""
            SELECT
                DATE_TRUNC('{safe_grain}', event_timestamp) AS ts,
                AVG({val_expr}) AS val,
                AVG({sec_expr}) AS sec_val,
                MIN({val_expr}) AS min_val,
                MAX({val_expr}) AS max_val
            FROM {table_name}
            {where_clause}
            GROUP BY 1
            ORDER BY 1 ASC
            LIMIT {safe_limit}
        """

        rows, is_cached, status = db_manager.execute_query(sql, params=params, cache_key=cache_key)

        points: List[TimeseriesPoint] = []
        for r in rows:
            ts_val = r.get("ts")
            val = round(float(r["val"]), 2) if r.get("val") is not None else None
            sec_val = round(float(r["sec_val"]), 2) if r.get("sec_val") is not None else None
            min_v = round(float(r["min_val"]), 2) if r.get("min_val") is not None else None
            max_v = round(float(r["max_val"]), 2) if r.get("max_val") is not None else None

            if ts_val and val is not None:
                points.append(
                    TimeseriesPoint(
                        timestamp=str(ts_val),
                        value=val,
                        secondary_value=sec_val,
                        min=min_v,
                        max=max_v,
                        device_id=device_id,
                    )
                )

        points.sort(key=lambda p: p.timestamp)

        return TimeseriesResponse(
            metric=metric,
            device_id=device_id,
            available=len(points) > 0,
            points=points,
            is_cached=is_cached,
            warehouse_status=status,
        )


databricks_service = DatabricksService()
