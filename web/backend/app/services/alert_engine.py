import time
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from app.config import settings
from app.database import db_manager
from app.models import AlertItem, AlertListResponse

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

    def get_alerts(self) -> AlertListResponse:
        """
        Evaluates rules against the latest data across dim_device and fact tables.
        """
        alerts: List[AlertItem] = []
        is_cached_total = False
        warehouse_status_total = "online"
        now_utc = datetime.now(timezone.utc)
        recent_window_ts = (now_utc - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")

        # 1. Device Offline Rule (> 3 minutes without data)
        sql_devices = f"""
            SELECT
                d.device_key,
                d.device_id,
                d.hostname,
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
            GROUP BY d.device_key, d.device_id, d.hostname
        """
        dev_rows, is_cached, status = db_manager.execute_query(sql_devices, cache_key="alerts_dev_status")
        is_cached_total = is_cached or is_cached_total
        if status != "online":
            warehouse_status_total = status

        for row in dev_rows:
            dev_id = row["device_id"]
            hostname = row.get("hostname") or dev_id
            ls_raw = row.get("last_seen")

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
                        if diff_sec <= 180:  # <= 3 minutes
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
                        metric="offline",
                        severity="critical",
                        rule_name="Device Offline",
                        message=f"No telemetry received for {diff_min if diff_min < 900 else '> 24h'} minutes",
                        threshold="> 3 minutes without data",
                        current_value=f"Inactive ({diff_min}m ago)",
                        triggered_at=str(ls_raw) if ls_raw else now_utc.isoformat(),
                        acknowledged=ack_time is not None,
                        acknowledged_at=ack_time,
                    )
                )

        # 2. CPU > 85% sustained
        sql_cpu = f"""
            SELECT
                d.device_id,
                d.hostname,
                AVG(c.cpu_utilization_pct) AS avg_cpu,
                MAX(c.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_cpu_telemetry c
            JOIN {self.prefix}.dim_device d ON c.device_key = d.device_key
            WHERE c.event_timestamp >= '{recent_window_ts}'
            GROUP BY d.device_id, d.hostname
            HAVING AVG(c.cpu_utilization_pct) > 85.0
        """
        cpu_rows, _, _ = db_manager.execute_query(sql_cpu, cache_key="alerts_cpu")
        for r in cpu_rows:
            dev_id = r["device_id"]
            avg_cpu = round(float(r["avg_cpu"]), 1)
            alert_id = f"alert-{dev_id}-cpu"
            with self._lock:
                ack_time = self._acknowledged.get(alert_id)
            alerts.append(
                AlertItem(
                    id=alert_id,
                    device_id=dev_id,
                    hostname=r.get("hostname") or dev_id,
                    metric="cpu",
                    severity="critical",
                    rule_name="CPU Utilization Critical",
                    message=f"Sustained high CPU usage across recent telemetry window ({avg_cpu}%)",
                    threshold="> 85% sustained",
                    current_value=f"{avg_cpu}%",
                    triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                    acknowledged=ack_time is not None,
                    acknowledged_at=ack_time,
                )
            )

        # 3. RAM > 90%
        sql_ram = f"""
            SELECT
                d.device_id,
                d.hostname,
                AVG(r.ram_utilization_pct) AS avg_ram,
                MAX(r.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_ram_telemetry r
            JOIN {self.prefix}.dim_device d ON r.device_key = d.device_key
            WHERE r.event_timestamp >= '{recent_window_ts}'
            GROUP BY d.device_id, d.hostname
            HAVING AVG(r.ram_utilization_pct) > 90.0
        """
        ram_rows, _, _ = db_manager.execute_query(sql_ram, cache_key="alerts_ram")
        for r in ram_rows:
            dev_id = r["device_id"]
            avg_ram = round(float(r["avg_ram"]), 1)
            alert_id = f"alert-{dev_id}-ram"
            with self._lock:
                ack_time = self._acknowledged.get(alert_id)
            alerts.append(
                AlertItem(
                    id=alert_id,
                    device_id=dev_id,
                    hostname=r.get("hostname") or dev_id,
                    metric="ram",
                    severity="critical",
                    rule_name="RAM Memory Exhaustion",
                    message=f"Memory utilization exceeds 90% threshold ({avg_ram}%)",
                    threshold="> 90%",
                    current_value=f"{avg_ram}%",
                    triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                    acknowledged=ack_time is not None,
                    acknowledged_at=ack_time,
                )
            )

        # 4. Disk > 90%
        sql_disk = f"""
            SELECT
                d.device_id,
                d.hostname,
                MAX(k.disk_utilization_pct) AS max_disk,
                MAX(k.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_disk_telemetry k
            JOIN {self.prefix}.dim_device d ON k.device_key = d.device_key
            WHERE k.event_timestamp >= '{recent_window_ts}'
            GROUP BY d.device_id, d.hostname
            HAVING MAX(k.disk_utilization_pct) > 90.0
        """
        disk_rows, _, _ = db_manager.execute_query(sql_disk, cache_key="alerts_disk")
        for r in disk_rows:
            dev_id = r["device_id"]
            max_d = round(float(r["max_disk"]), 1)
            alert_id = f"alert-{dev_id}-disk"
            with self._lock:
                ack_time = self._acknowledged.get(alert_id)
            alerts.append(
                AlertItem(
                    id=alert_id,
                    device_id=dev_id,
                    hostname=r.get("hostname") or dev_id,
                    metric="disk",
                    severity="critical",
                    rule_name="Disk Space Low",
                    message=f"Disk utilization has exceeded 90% capacity ({max_d}%)",
                    threshold="> 90%",
                    current_value=f"{max_d}%",
                    triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                    acknowledged=ack_time is not None,
                    acknowledged_at=ack_time,
                )
            )

        # 5. Temperature > 35°C
        sql_env = f"""
            SELECT
                d.device_id,
                d.hostname,
                MAX(e.temperature_c) AS max_temp,
                MAX(e.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_environment_telemetry e
            JOIN {self.prefix}.dim_device d ON e.device_key = d.device_key
            WHERE e.event_timestamp >= '{recent_window_ts}'
            GROUP BY d.device_id, d.hostname
            HAVING MAX(e.temperature_c) > 35.0
        """
        env_rows, _, _ = db_manager.execute_query(sql_env, cache_key="alerts_env")
        for r in env_rows:
            dev_id = r["device_id"]
            max_t = round(float(r["max_temp"]), 1)
            alert_id = f"alert-{dev_id}-temp"
            with self._lock:
                ack_time = self._acknowledged.get(alert_id)
            alerts.append(
                AlertItem(
                    id=alert_id,
                    device_id=dev_id,
                    hostname=r.get("hostname") or dev_id,
                    metric="temperature",
                    severity="warning" if max_t <= 45 else "critical",
                    rule_name="High Ambient Temperature",
                    message=f"Environment sensor detected temperature exceeding 35°C threshold ({max_t}°C)",
                    threshold="> 35°C",
                    current_value=f"{max_t}°C",
                    triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                    acknowledged=ack_time is not None,
                    acknowledged_at=ack_time,
                )
            )

        # 6. Battery low (< 20%) or Battery health low (< 60%)
        sql_batt = f"""
            SELECT
                d.device_id,
                d.hostname,
                MIN(b.battery_pct) AS min_batt,
                MIN(b.battery_health_pct) AS min_health,
                MAX(b.event_timestamp) AS latest_ts
            FROM {self.prefix}.fact_battery_telemetry b
            JOIN {self.prefix}.dim_device d ON b.device_key = d.device_key
            WHERE b.event_timestamp >= '{recent_window_ts}'
            GROUP BY d.device_id, d.hostname
            HAVING MIN(b.battery_pct) < 20.0 OR MIN(b.battery_health_pct) < 60.0
        """
        batt_rows, _, _ = db_manager.execute_query(sql_batt, cache_key="alerts_batt")
        for r in batt_rows:
            dev_id = r["device_id"]
            min_b = round(float(r["min_batt"]), 1) if r.get("min_batt") is not None else 100.0
            min_h = round(float(r["min_health"]), 1) if r.get("min_health") is not None else 100.0
            alert_id = f"alert-{dev_id}-battery"
            with self._lock:
                ack_time = self._acknowledged.get(alert_id)
            alerts.append(
                AlertItem(
                    id=alert_id,
                    device_id=dev_id,
                    hostname=r.get("hostname") or dev_id,
                    metric="battery",
                    severity="warning",
                    rule_name="Battery Depleted or Degraded",
                    message=f"Battery level is at {min_b}% (Health: {min_h}%)",
                    threshold="< 20% or Health < 60%",
                    current_value=f"{min_b}% (Health {min_h}%)",
                    triggered_at=str(r.get("latest_ts") or now_utc.isoformat()),
                    acknowledged=ack_time is not None,
                    acknowledged_at=ack_time,
                )
            )

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
