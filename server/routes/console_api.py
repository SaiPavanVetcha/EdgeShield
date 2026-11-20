import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from config import (
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    HOST,
    PORT,
    SPOOL_MAX_RECORDS,
)
from database import get_last_flush_status, trigger_flush
from device_registry import counts as registry_counts, list_devices
from log_buffer import get_recent_logs
from runtime_config import (
    ALLOWED_STORAGE_MODES,
    get_storage_mode,
    is_databricks_configured,
    set_storage_mode,
)
from spool import count as spool_count

router = APIRouter(prefix="/api/console", tags=["console"])

_SERVER_START_TIME = time.time()


class StorageModeRequest(BaseModel):
    mode: str = Field(..., description="'local' or 'databricks'")


def get_uptime_seconds() -> float:
    """Calculates server uptime in seconds."""
    return round(time.time() - _SERVER_START_TIME, 1)


@router.get("/status")
def get_console_status() -> Dict[str, Any]:
    """
    Returns real-time status of the ingestion server, including uptime,
    active storage mode, Databricks configuration state, spool metrics, and devices.
    """
    device_counts = registry_counts(online_within_seconds=120)
    current_storage_mode = get_storage_mode()
    db_configured = is_databricks_configured()
    pending_records = spool_count()
    last_flush = get_last_flush_status()

    return {
        "status": "online",
        "server_online": True,
        "host": HOST,
        "port": PORT,
        "uptime_seconds": get_uptime_seconds(),
        "storage_mode": current_storage_mode,
        "databricks_configured": db_configured,
        "pending": pending_records,
        "last_flush": last_flush,
        "spool": {
            "pending": pending_records,
            "max_records": SPOOL_MAX_RECORDS,
            "flush_interval_seconds": FLUSH_INTERVAL_SECONDS,
            "flush_max_records": FLUSH_MAX_RECORDS,
            "last_flush": last_flush,
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


@router.post("/storage-mode")
def update_storage_mode(payload: StorageModeRequest) -> Dict[str, Any]:
    """
    Persists and switches the server storage mode to 'local' or 'databricks'.
    """
    mode = payload.mode.strip().lower()
    if mode not in ALLOWED_STORAGE_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid storage mode '{payload.mode}'. Must be one of: {sorted(ALLOWED_STORAGE_MODES)}",
        )

    try:
        updated_mode = set_storage_mode(mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist storage mode: {str(e)}")

    return {
        "status": "success",
        "storage_mode": updated_mode,
        "message": f"Storage mode switched to '{updated_mode}'.",
        "console_status": get_console_status(),
    }


@router.post("/flush")
def manual_flush() -> Dict[str, Any]:
    """
    Triggers an immediate flush cycle appropriate to the current storage mode.
    Returns flush outcome and pending record counts.
    """
    try:
        result = trigger_flush()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flush cycle error: {str(e)}")


@router.get("/logs")
def get_console_logs(limit: int = Query(default=100, ge=1, le=500)) -> Dict[str, Any]:
    """
    Returns recent in-memory log entries from the server ring buffer.
    """
    logs = get_recent_logs(limit=limit)
    return {
        "total": len(logs),
        "limit": limit,
        "logs": logs,
    }
