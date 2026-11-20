import time
from typing import Any, Dict, List
from fastapi import APIRouter
from config import (
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    HOST,
    PORT,
    SPOOL_MAX_RECORDS,
    STORAGE_MODE,
)
from database import get_last_flush_status
from device_registry import counts as registry_counts, list_devices
from spool import count as spool_count

router = APIRouter(prefix="/api/console", tags=["console"])

_SERVER_START_TIME = time.time()


def get_uptime_seconds() -> float:
    """Calculates server uptime in seconds."""
    return round(time.time() - _SERVER_START_TIME, 1)


@router.get("/status")
def get_console_status() -> Dict[str, Any]:
    """
    Returns real-time status of the ingestion server, including uptime,
    spool metrics, storage mode, and active device counts.
    """
    device_counts = registry_counts(online_within_seconds=120)
    return {
        "status": "online",
        "server_online": True,
        "host": HOST,
        "port": PORT,
        "uptime_seconds": get_uptime_seconds(),
        "storage_mode": STORAGE_MODE,
        "spool": {
            "pending": spool_count(),
            "max_records": SPOOL_MAX_RECORDS,
            "flush_interval_seconds": FLUSH_INTERVAL_SECONDS,
            "flush_max_records": FLUSH_MAX_RECORDS,
            "last_flush": get_last_flush_status(),
        },
        "devices": device_counts,
    }


@router.get("/devices")
def get_console_devices() -> Dict[str, Any]:
    """
    Returns registered devices sorted by last_seen_utc descending,
    with dynamically evaluated online statuses.
    """
    devices = list_devices(online_within_seconds=120)
    online_count = sum(1 for d in devices if d.get("is_online"))
    return {
        "total": len(devices),
        "online": online_count,
        "devices": devices,
    }
