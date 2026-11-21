import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_registry_lock = threading.Lock()
_devices: Dict[str, Dict[str, Any]] = {}


def _parse_iso_utc(ts_str: Optional[str]) -> Optional[datetime]:
    """Helper to parse ISO-8601 timestamp string into timezone-aware datetime."""
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def upsert_from_request(payload: dict, client_ip: str) -> Optional[Dict[str, Any]]:
    """
    Updates or inserts a device record in the in-memory registry upon receiving a telemetry payload.
    Extracts device_id, hostname, type, platform, room, client_ip, last_seen_utc, and last_payload_meta.
    """
    if not isinstance(payload, dict):
        return None

    device_id = payload.get("device_id")
    if not device_id:
        return None

    metrics = payload.get("metrics")
    system_metrics = metrics.get("system") if isinstance(metrics, dict) else {}

    hostname = (
        payload.get("hostname")
        or (system_metrics.get("hostname") if isinstance(system_metrics, dict) else None)
        or "unknown"
    )
    raw_type = payload.get("type")
    if raw_type:
        device_type = raw_type
    elif isinstance(metrics, dict) and any(k in metrics for k in ("dht11", "dht22", "environment")):
        device_type = "esp32_telemetry"
    elif str(device_id).lower().startswith("esp32"):
        device_type = "esp32_telemetry"
    else:
        device_type = "pc_telemetry"

    platform = (
        payload.get("platform")
        or (system_metrics.get("platform") if isinstance(system_metrics, dict) else None)
        or ("ESP32" if "esp32" in str(device_type).lower() or (isinstance(metrics, dict) and any(k in metrics for k in ("dht11", "dht22"))) else None)
    )
    room = payload.get("room")
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    sections = list(metrics.keys()) if isinstance(metrics, dict) else []
    last_payload_meta = {
        "payload_timestamp": payload.get("timestamp"),
        "sections": sections,
    }

    record = {
        "device_id": str(device_id),
        "hostname": str(hostname),
        "type": str(device_type),
        "platform": str(platform) if platform else None,
        "room": str(room) if room else None,
        "client_ip": str(client_ip) if client_ip else "unknown",
        "last_seen_utc": now_iso,
        "last_payload_meta": last_payload_meta,
    }

    with _registry_lock:
        _devices[device_id] = record

    return record


def list_devices(online_within_seconds: int = 120) -> List[Dict[str, Any]]:
    """
    Returns all registered devices sorted by last_seen_utc descending.
    Each device includes a calculated 'is_online' boolean based on online_within_seconds.
    """
    now = datetime.now(timezone.utc)
    result = []

    with _registry_lock:
        records = [dict(d) for d in _devices.values()]

    for dev in records:
        dt = _parse_iso_utc(dev.get("last_seen_utc"))
        if dt:
            dev["is_online"] = (now - dt).total_seconds() <= online_within_seconds
        else:
            dev["is_online"] = False
        result.append(dev)

    result.sort(key=lambda x: x.get("last_seen_utc") or "", reverse=True)
    return result


def counts(online_within_seconds: int = 120) -> Dict[str, int]:
    """
    Returns device counts: total and online (seen within online_within_seconds).
    """
    now = datetime.now(timezone.utc)
    total = 0
    online = 0

    with _registry_lock:
        records = [d.get("last_seen_utc") for d in _devices.values()]

    total = len(records)
    for ts_str in records:
        dt = _parse_iso_utc(ts_str)
        if dt and (now - dt).total_seconds() <= online_within_seconds:
            online += 1

    return {"total": total, "online": online}


def get_device(device_id: str, online_within_seconds: int = 120) -> Optional[Dict[str, Any]]:
    """Returns a single device by ID with is_online flag, or None if not found."""
    with _registry_lock:
        dev = _devices.get(device_id)
        if not dev:
            return None
        record = dict(dev)

    now = datetime.now(timezone.utc)
    dt = _parse_iso_utc(record.get("last_seen_utc"))
    record["is_online"] = (dt is not None) and ((now - dt).total_seconds() <= online_within_seconds)
    return record


def clear_registry() -> None:
    """Clears the in-memory device registry (primarily for test isolation)."""
    with _registry_lock:
        _devices.clear()
