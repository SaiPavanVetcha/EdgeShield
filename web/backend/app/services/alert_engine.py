import time
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from app.config import settings
from app.database import db_manager
from app.models import AlertItem, AlertListResponse
from app.services.alert_settings_service import alert_settings_service

logger = logging.getLogger("edgeshield.alert_engine")


class AlertEngine:
    def __init__(self):
        self._acknowledged: Dict[str, str] = {}
        self._lock = threading.Lock()
        self.prefix = settings.gold_table_prefix

    def acknowledge_alert(self, alert_id: str) -> bool:
        with self._lock:
            self._acknowledged[alert_id] = datetime.now(timezone.utc).isoformat()
            return True

    def get_alerts(self, room: Optional[str] = None) -> AlertListResponse:
        """
        Evaluates rules against the latest data across dim_device and fact tables.
        Applies room-scoped alert thresholds from alert_settings_service.
        Optionally filters results to a specific room or unassigned devices.
        """
        alerts: List[AlertItem] = []
        is_cached_total = False
        warehouse_status_total = "online"
        now_utc = datetime.now(timezone.utc)
        # Validation safety layer: recent_window_ts is generated internally from UTC clock and formatted
        # via strftime to standard timestamp pattern, bound safely via :window_ts named parameter.
        recent_window_ts = (now_utc - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")

        # 1. Device Offline Rule
        # Validation safety layer: static query over trusted catalog/schema prefix; no untrusted parameters.
        sql_devices = f"""
            SELECT
                d.device_key,
                d.device_id,
                d.hostname,
                d.room,
                MAX(events.event_timestamp) AS last_seen
            FROM {self.prefix}.dim_device d
            LEFT JOIN (
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_cpu_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_ram_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_disk_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_environment_telemetry
                UNION ALL
                SELECT device_key, event_timestamp FROM {self.prefix}.fact_battery_telemetry
            ) events ON d.device_key = events.device_key
            GROUP BY d.device_key, d.device_id, d.hostname, d.room
        """
        dev_rows, is_cached, status = db_manager.execute_query(sql_devices, cache_key="alerts_dev_status")
        is_cached_total = is_cached or is_cached_total
        if status != "online":
            warehouse_status_total = status

        for row in dev_rows:
            dev_id = row["device_id"]
            hostname = row.get("hostname") or dev_id
            dev_room = row.get("room")
            ls_raw = row.get("last_seen")

            thresh = alert_settings_service.get_thresholds_for_room(dev_room)
            offline_limit_min = thresh.offline_minutes

            is_offline = True
            diff_min = 999.0

            if ls_raw:
                try:
                    if isinstance(ls_raw, str):
                        clean_ts = ls_raw.replace("T", " ").split(".")[0]
                        dt = datetime.strptime(clean_ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                    elif isinstance(ls_raw, datetime):
                        dt = ls_raw if ls_raw.tzinfo else ls_raw.replace(tzinfo=timezone.utc)
                    else:
                        dt = None

                    if dt:
                        diff_sec = (now_utc - dt).total_seconds()
                        diff_min = round(diff_sec / 60.0, 1)
                        if diff_sec <= (offline_limit_min * 60):
                            is_offline = False
                except Exception:
                    pass

            if is_offline:
                alert_id = f"alert-{dev_id}-offline"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=hostname,
                        room=dev_room,
                        metric="offline",
                        severity="critical",
                        rule_name="Device Offline",
                        message=f"No telemetry received for {diff_min if diff_min < 900 else '> 24h'} minutes",
                        threshold=f"> {offline_limit_min} minutes without data",
                        current_value=f"Inactive ({diff_min}m ago)",
                        triggered_at=str(ls_raw) if ls_raw else now_utc.isoformat(),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 2. CPU Sustained Load Rule
        # Validation safety layer: :window_ts parameterization prevents injection into filter clauses.
        window_params = {"window_ts": recent_window_ts}

        sql_cpu = f"""
            SELECT
                d.device_id,
                d.hostname,
                d.room,
                AVG(c.cpu_utilization_pct) AS avg_cpu,
                MAX(c.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_cpu_telemetry c
            JOIN {self.prefix}.dim_device d ON c.device_key = d.device_key
            WHERE c.event_timestamp >= :window_ts
            GROUP BY d.device_id, d.hostname, d.room
        """
        cpu_rows, _, _ = db_manager.execute_query(sql_cpu, params=window_params, cache_key="alerts_cpu")
        for r in cpu_rows:
            dev_id = r["device_id"]
            dev_room = r.get("room")
            avg_cpu = round(float(r["avg_cpu"]), 1)
            thresh = alert_settings_service.get_thresholds_for_room(dev_room)

            if avg_cpu > thresh.cpu_pct:
                alert_id = f"alert-{dev_id}-cpu"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=r.get("hostname") or dev_id,
                        room=dev_room,
                        metric="cpu",
                        severity="critical",
                        rule_name="CPU Utilization Critical",
                        message=f"Sustained high CPU usage across recent telemetry window ({avg_cpu}%)",
                        threshold=f"> {thresh.cpu_pct}% sustained",
                        current_value=f"{avg_cpu}%",
                        triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 3. RAM Memory Exhaustion Rule
        sql_ram = f"""
            SELECT
                d.device_id,
                d.hostname,
                d.room,
                AVG(r.ram_utilization_pct) AS avg_ram,
                MAX(r.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_ram_telemetry r
            JOIN {self.prefix}.dim_device d ON r.device_key = d.device_key
            WHERE r.event_timestamp >= :window_ts
            GROUP BY d.device_id, d.hostname, d.room
        """
        ram_rows, _, _ = db_manager.execute_query(sql_ram, params=window_params, cache_key="alerts_ram")
        for r in ram_rows:
            dev_id = r["device_id"]
            dev_room = r.get("room")
            avg_ram = round(float(r["avg_ram"]), 1)
            thresh = alert_settings_service.get_thresholds_for_room(dev_room)

            if avg_ram > thresh.ram_pct:
                alert_id = f"alert-{dev_id}-ram"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=r.get("hostname") or dev_id,
                        room=dev_room,
                        metric="ram",
                        severity="critical",
                        rule_name="RAM Memory Exhaustion",
                        message=f"Memory utilization exceeds {thresh.ram_pct}% threshold ({avg_ram}%)",
                        threshold=f"> {thresh.ram_pct}%",
                        current_value=f"{avg_ram}%",
                        triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 4. Disk Capacity Rule
        sql_disk = f"""
            SELECT
                d.device_id,
                d.hostname,
                d.room,
                MAX(k.disk_utilization_pct) AS max_disk,
                MAX(k.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_disk_telemetry k
            JOIN {self.prefix}.dim_device d ON k.device_key = d.device_key
            WHERE k.event_timestamp >= :window_ts
            GROUP BY d.device_id, d.hostname, d.room
        """
        disk_rows, _, _ = db_manager.execute_query(sql_disk, params=window_params, cache_key="alerts_disk")
        for r in disk_rows:
            dev_id = r["device_id"]
            dev_room = r.get("room")
            max_d = round(float(r["max_disk"]), 1)
            thresh = alert_settings_service.get_thresholds_for_room(dev_room)

            if max_d > thresh.disk_pct:
                alert_id = f"alert-{dev_id}-disk"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=r.get("hostname") or dev_id,
                        room=dev_room,
                        metric="disk",
                        severity="critical",
                        rule_name="Disk Space Low",
                        message=f"Disk utilization has exceeded {thresh.disk_pct}% capacity ({max_d}%)",
                        threshold=f"> {thresh.disk_pct}%",
                        current_value=f"{max_d}%",
                        triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 5. Ambient Temperature Rule
        sql_env = f"""
            SELECT
                d.device_id,
                d.hostname,
                d.room,
                MAX(e.temperature_c) AS max_temp,
                MAX(e.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_environment_telemetry e
            JOIN {self.prefix}.dim_device d ON e.device_key = d.device_key
            WHERE e.event_timestamp >= :window_ts
            GROUP BY d.device_id, d.hostname, d.room
        """
        env_rows, _, _ = db_manager.execute_query(sql_env, params=window_params, cache_key="alerts_env")
        for r in env_rows:
            dev_id = r["device_id"]
            dev_room = r.get("room")
            max_t = round(float(r["max_temp"]), 1)
            thresh = alert_settings_service.get_thresholds_for_room(dev_room)

            if max_t > thresh.temperature_c:
                alert_id = f"alert-{dev_id}-temp"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=r.get("hostname") or dev_id,
                        room=dev_room,
                        metric="temperature",
                        severity="warning" if max_t <= 45 else "critical",
                        rule_name="High Ambient Temperature",
                        message=f"Environment sensor detected temperature exceeding {thresh.temperature_c}°C threshold ({max_t}°C)",
                        threshold=f"> {thresh.temperature_c}°C",
                        current_value=f"{max_t}°C",
                        triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 6. Battery low or Battery health low - strictly for devices with battery present
        # Suppressed if device does not report battery telemetry or battery_pct is null
        sql_batt = f"""
            SELECT
                d.device_id,
                d.hostname,
                d.room,
                MIN(b.battery_pct) AS min_batt,
                MIN(b.battery_health_pct) AS min_health,
                MAX(b.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_battery_telemetry b
            JOIN {self.prefix}.dim_device d ON b.device_key = d.device_key
            WHERE b.event_timestamp >= :window_ts
              AND b.battery_pct IS NOT NULL
              AND b.battery_pct > 0.0
            GROUP BY d.device_id, d.hostname, d.room
        """
        batt_rows, _, _ = db_manager.execute_query(sql_batt, params=window_params, cache_key="alerts_batt")
        for r in batt_rows:
            if r.get("min_batt") is None and r.get("min_health") is None:
                continue
            dev_id = r["device_id"]
            dev_room = r.get("room")
            thresh = alert_settings_service.get_thresholds_for_room(dev_room)

            min_b = round(float(r["min_batt"]), 1) if r.get("min_batt") is not None else 100.0
            min_h = round(float(r["min_health"]), 1) if r.get("min_health") is not None else 100.0

            is_batt_low = r.get("min_batt") is not None and min_b < thresh.battery_pct
            is_health_low = r.get("min_health") is not None and min_h < thresh.battery_health_pct

            if is_batt_low or is_health_low:
                alert_id = f"alert-{dev_id}-battery"
                with self._lock:
                    ack_time = self._acknowledged.get(alert_id)
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        device_id=dev_id,
                        hostname=r.get("hostname") or dev_id,
                        room=dev_room,
                        metric="battery",
                        severity="warning",
                        rule_name="Battery Depleted or Degraded",
                        message=f"Battery level is at {min_b}% (Health: {min_h}%)",
                        threshold=f"< {thresh.battery_pct}% or Health < {thresh.battery_health_pct}%",
                        current_value=f"{min_b}% (Health {min_h}%)",
                        triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # Optional room filtering (safety layer: in-memory filter against validated room parameter)
        if room:
            clean_room = room.strip()
            if clean_room.lower() == "unassigned":
                alerts = [a for a in alerts if not a.room or not a.room.strip()]
            elif clean_room.lower() != "all":
                alerts = [a for a in alerts if (a.room or "").strip().lower() == clean_room.lower()]

        active_count = sum(1 for a in alerts if not a.acknowledged)
        critical_count = sum(1 for a in alerts if a.severity == "critical" and not a.acknowledged)
        warning_count = sum(1 for a in alerts if a.severity == "warning" and not a.acknowledged)

        return AlertListResponse(
            alerts=alerts,
            total_count=len(alerts),
            active_count=active_count,
            critical_count=critical_count,
            warning_count=warning_count,
            is_cached=is_cached_total,
            warehouse_status=warehouse_status_total,
        )


alert_engine = AlertEngine()
