import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_logger = logging.getLogger("edgeshield.registry")
_registry_lock = threading.Lock()
_devices: Dict[str, Dict[str, Any]] = {}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
DEVICES_FILE = os.path.join(DATA_DIR, "devices.json")


def _parse_iso_utc(ts_str: Optional[str]) -> Optional[datetime]:
    """Helper to parse ISO-8601 timestamp string into timezone-aware datetime."""
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(str(ts_str))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _save_registry_to_disk() -> None:
    """Persists the in-memory registry to disk as JSON atomically."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp_file = DEVICES_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(_devices, f, indent=2, ensure_ascii=False)
        # Atomic rename on Windows/Linux
        if os.path.exists(DEVICES_FILE):
            os.replace(tmp_file, DEVICES_FILE)
        else:
            os.rename(tmp_file, DEVICES_FILE)
    except Exception as e:
        _logger.error("Failed to persist device registry to %s: %s", DEVICES_FILE, e)


def load_registry(file_path: Optional[str] = None) -> int:
    """
    Loads persisted device registry from disk into memory.
    Returns the number of devices loaded.
    """
    path = file_path or DEVICES_FILE
    if not os.path.exists(path):
        return 0

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict):
            with _registry_lock:
                for k, v in data.items():
                    if isinstance(v, dict) and "device_id" in v:
                        # Ensure baseline payload count
                        v.setdefault("payload_count", 1)
                        _devices[k] = v
            _logger.info("Loaded %d device(s) from %s", len(_devices), path)
            return len(_devices)
    except Exception as e:
        _logger.warning("Could not read device registry from %s (%s). Starting fresh.", path, e)
    return 0


# Load on initial module import
load_registry()


def upsert_from_request(payload: dict, client_ip: str) -> Optional[Dict[str, Any]]:
    """
    Updates or inserts a device record in the registry upon receiving a telemetry payload.
    Extracts device_id, hostname, type, platform, room, client_ip, last_seen_utc,
    increments payload_count, and persists to server/data/devices.json.
    """
    if not isinstance(payload, dict):
        return None

    raw_device_id = payload.get("device_id")
    if not raw_device_id:
        return None
    device_id = str(raw_device_id).strip()
    if not device_id:
        return None

    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    metrics = payload.get("metrics")
    system_metrics = metrics.get("system") if isinstance(metrics, dict) else {}

    with _registry_lock:
        existing = dict(_devices.get(device_id, {}))

    # Hostname resolution
    hostname = (
        payload.get("hostname")
        or (system_metrics.get("hostname") if isinstance(system_metrics, dict) else None)
        or existing.get("hostname")
        or device_id
    )

    # Device Type resolution
    raw_type = payload.get("type")
    if raw_type:
        device_type = str(raw_type)
    elif isinstance(metrics, dict) and any(k in metrics for k in ("dht11", "dht22", "environment")):
        device_type = "esp32_telemetry"
    elif device_id.lower().startswith("esp32"):
        device_type = "esp32_telemetry"
    elif existing.get("type"):
        device_type = existing["type"]
    else:
        device_type = "pc_telemetry"

    # Platform resolution
    platform = (
        payload.get("platform")
        or (system_metrics.get("platform") if isinstance(system_metrics, dict) else None)
        or ("ESP32" if "esp32" in str(device_type).lower() or (isinstance(metrics, dict) and any(k in metrics for k in ("dht11", "dht22"))) else None)
        or existing.get("platform")
    )

    # Room resolution (normalize empty string to None, retain existing if omitted)
    raw_room = payload.get("room")
    if raw_room is not None:
        cleaned_room = str(raw_room).strip()
        room = cleaned_room if cleaned_room != "" else None
    else:
        room = existing.get("room")

    # Client IP resolution
    clean_ip = str(client_ip).strip() if client_ip and client_ip != "unknown" else existing.get("client_ip", "unknown")

    # Payload counter
    prev_count = existing.get("payload_count", 0)
    payload_count = prev_count + 1

    first_seen_utc = existing.get("first_seen_utc") or now_iso

    sections = list(metrics.keys()) if isinstance(metrics, dict) else []
    last_payload_meta = {
        "payload_timestamp": payload.get("timestamp"),
        "sections": sections,
    }

    record = {
        "device_id": device_id,
        "hostname": str(hostname),
        "type": str(device_type),
        "platform": str(platform) if platform else None,
        "room": str(room) if room else None,
        "client_ip": clean_ip,
        "first_seen_utc": str(first_seen_utc),
        "last_seen_utc": now_iso,
        "payload_count": payload_count,
        "last_payload_meta": last_payload_meta,
    }

    with _registry_lock:
        _devices[device_id] = record
        _save_registry_to_disk()

    return record


def list_devices(online_within_seconds: int = 120) -> List[Dict[str, Any]]:
    """
    Returns all registered devices sorted by last_seen_utc descending.
    Each device includes calculated 'is_online' boolean and 'seconds_since_seen' integer.
    Guarantees stable keys for frontend rendering safety.
    """
    now = datetime.now(timezone.utc)
    result = []

    with _registry_lock:
        records = [dict(d) for d in _devices.values()]

    for dev in records:
        dt = _parse_iso_utc(dev.get("last_seen_utc"))
        if dt:
            secs = max(0, int((now - dt).total_seconds()))
            dev["is_online"] = secs <= online_within_seconds
            dev["seconds_since_seen"] = secs
        else:
            dev["is_online"] = False
            dev["seconds_since_seen"] = None

        dev.setdefault("payload_count", 1)
        dev.setdefault("client_ip", "unknown")
        dev.setdefault("room", None)
        dev.setdefault("platform", None)
        dev.setdefault("type", "pc_telemetry")
        dev.setdefault("first_seen_utc", dev.get("last_seen_utc"))
        result.append(dev)

    result.sort(key=lambda x: x.get("last_seen_utc") or "", reverse=True)
    return result


def counts(online_within_seconds: int = 120) -> Dict[str, int]:
    """
    Returns device counts: total and online (seen within online_within_seconds).
    Guarantees agreement with list_devices().
    """
    now = datetime.now(timezone.utc)
    with _registry_lock:
        records = [dict(d) for d in _devices.values()]

    total = len(records)
    online = 0
    for d in records:
        dt = _parse_iso_utc(d.get("last_seen_utc"))
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
    if dt:
        secs = max(0, int((now - dt).total_seconds()))
        record["is_online"] = secs <= online_within_seconds
        record["seconds_since_seen"] = secs
    else:
        record["is_online"] = False
        record["seconds_since_seen"] = None

    record.setdefault("payload_count", 1)
    return record


def clear_registry(delete_file: bool = True) -> None:
    """Clears the in-memory device registry (primarily for test isolation)."""
    with _registry_lock:
        _devices.clear()
        if delete_file and os.path.exists(DEVICES_FILE):
            try:
                os.remove(DEVICES_FILE)
            except Exception:
                pass
